"""
Flask server for Interactive Pages MVP.
Implements end-to-end generation pipeline.
"""
import os
import sys
import uuid
import logging
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.rate_limiter import RateLimiter
from utils.html_validator import validate_html
from services.lesson_service import LessonService
from services.metadata_store import MetadataStore

load_dotenv()

# Configure logging FIRST (before any logger usage)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Use mock services if TEST_MODE is enabled
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"

if TEST_MODE:
    logger.info("🧪 TEST MODE ENABLED - Using mock services")
    from services.mock_services import MockGeminiService as GeminiService, MockRunPodService as RunPodService, MockGitHubService as GitHubService
else:
    from services.gemini_service import GeminiService
    from services.runpod_service import RunPodService
    from services.github_service import GitHubService

app = Flask(__name__)
CORS(app)

# Initialize services
if TEST_MODE:
    # Mock services don't need API keys
    gemini = GeminiService()
    runpod = RunPodService()
    github = GitHubService()
    logger.info("✅ Mock services initialized (TEST_MODE)")
else:
    try:
        gemini = GeminiService(api_key=os.getenv("GEMINI_API_KEY"))
        logger.info("✅ Gemini service initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Gemini: {e}")
        gemini = None

    try:
        runpod = RunPodService(
            openhands_url=os.getenv("RUNPOD_OPENHANDS_URL"),
            api_key=os.getenv("RUNPOD_API_KEY")
        )
        logger.info("✅ RunPod service initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize RunPod: {e}")
        runpod = None

    try:
        github = GitHubService(
            token=os.getenv("GITHUB_TOKEN"),
            pages_repo=os.getenv("GITHUB_PAGES_REPO"),
            owner=os.getenv("GITHUB_OWNER"),
            branch=os.getenv("GITHUB_BRANCH", "main")
        )
        logger.info("✅ GitHub service initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize GitHub: {e}")
        github = None

lesson_service = LessonService()
metadata_store = MetadataStore()
rate_limiter = RateLimiter(max_requests=10, window_seconds=60)

# In-memory job storage (MVP)
jobs = {}


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "services": {
            "gemini": gemini is not None,
            "runpod": runpod is not None,
            "github": github is not None
        }
    })


@app.route("/test", methods=["GET"])
def test_ui():
    """Serve the test UI page."""
    test_ui_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "test_ui.html"
    )
    try:
        with open(test_ui_path, 'r') as f:
            return f.read(), 200, {'Content-Type': 'text/html'}
    except FileNotFoundError:
        return jsonify({"error": "Test UI not found"}), 404


@app.route("/interactive/generate", methods=["POST"])
def generate_interactive_page():
    """
    Generate an interactive HTML page from lesson content.
    
    Request body:
    {
        "lesson_id": "string (required)",
        "user_feedback": "string (optional)",
        "mode": "new" | "regen" (optional, default: "new")
    }
    
    Response (202 Accepted):
    {
        "generation_id": "uuid"
    }
    """
    # Validate input
    data = request.json or {}
    lesson_id = data.get("lesson_id")
    
    if not lesson_id:
        logger.warning("Missing lesson_id in request")
        return jsonify({"error": "lesson_id is required"}), 400
    
    # Check service availability
    if not gemini:
        return jsonify({"error": "Gemini service not available"}), 503
    if not runpod:
        return jsonify({"error": "RunPod service not available"}), 503
    if not github:
        return jsonify({"error": "GitHub service not available"}), 503
    
    # Rate limiting (optional: use user_id from auth if available)
    user_id = data.get("user_id", request.remote_addr)
    if not rate_limiter.allow(user_id):
        logger.warning(f"Rate limit exceeded for user: {user_id}")
        return jsonify({
            "error": "Rate limit exceeded. Please try again later."
        }), 429
    
    # Create generation job
    generation_id = str(uuid.uuid4())
    jobs[generation_id] = {
        "id": generation_id,
        "lesson_id": lesson_id,
        "status": "queued",
        "mode": data.get("mode", "new"),
        "user_feedback": data.get("user_feedback"),
        "created_at": datetime.utcnow().isoformat(),
        "error": None
    }
    
    logger.info(f"Created generation job: {generation_id} for lesson: {lesson_id}")
    
    # Start async generation
    thread = threading.Thread(target=_run_generation_pipeline, args=(generation_id, lesson_id, data))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "generation_id": generation_id
    }), 202


def _run_generation_pipeline(generation_id: str, lesson_id: str, request_data: dict):
    """
    Run the complete generation pipeline:
    a) Fetch lesson data
    b) Gemini 3 -> JSON spec
    c) RunPod OpenHands -> HTML
    d) Validate HTML
    e) Publish to GitHub
    f) Mark done
    """
    try:
        # Stage a: Fetch lesson data
        logger.info(f"[{generation_id}] Stage a: Fetching lesson data...")
        jobs[generation_id]["status"] = "queued"
        
        lesson = lesson_service.get_lesson(lesson_id)
        logger.info(f"[{generation_id}] Fetched lesson: {lesson['title']}")
        
        # Stage b: Generate spec with Gemini 3
        logger.info(f"[{generation_id}] Stage b: Generating spec with Gemini...")
        jobs[generation_id]["status"] = "spec"
        
        spec = gemini.generate_spec(
            title=lesson["title"],
            transcript=lesson.get("transcript", ""),
            summary=lesson.get("summary", ""),
            user_feedback=jobs[generation_id].get("user_feedback")
        )
        jobs[generation_id]["spec"] = spec
        logger.info(f"[{generation_id}] Generated spec with {len(spec.get('scenes', []))} scenes")
        
        # Stage c: Generate HTML with OpenHands
        logger.info(f"[{generation_id}] Stage c: Generating HTML with OpenHands...")
        jobs[generation_id]["status"] = "building"
        
        html_content = runpod.generate_html(
            spec=spec,
            lesson_summary=lesson.get("summary", "")
        )
        logger.info(f"[{generation_id}] Generated HTML ({len(html_content)} chars)")
        
        # Stage d: Validate HTML
        logger.info(f"[{generation_id}] Stage d: Validating HTML...")
        validation_result = validate_html(html_content)
        
        if not validation_result["valid"]:
            error_msg = f"Validation failed: {', '.join(validation_result['errors'])}"
            logger.error(f"[{generation_id}] {error_msg}")
            jobs[generation_id]["status"] = "failed"
            jobs[generation_id]["error"] = error_msg
            return
        
        logger.info(f"[{generation_id}] HTML validation passed ({validation_result['size_kb']:.1f} KB)")
        
        # Stage e: Publish to GitHub
        logger.info(f"[{generation_id}] Stage e: Publishing to GitHub...")
        jobs[generation_id]["status"] = "publishing"
        
        publish_result = github.publish_html(
            html_content=html_content,
            generation_id=generation_id,
            title=lesson["title"]
        )
        
        # Stage f: Mark done
        jobs[generation_id]["status"] = "done"
        jobs[generation_id]["preview_url"] = publish_result["preview_url"]
        jobs[generation_id]["source_url"] = publish_result["source_url"]
        
        logger.info(f"[{generation_id}] ✅ Generation complete! Preview: {publish_result['preview_url']}")
        
        # Store metadata
        metadata_store.save(generation_id, {
            "lesson_id": lesson_id,
            "title": lesson["title"],
            "preview_url": publish_result["preview_url"],
            "source_url": publish_result["source_url"],
            "created_at": jobs[generation_id]["created_at"],
            "status": "done"
        })
        
    except ValueError as e:
        # Lesson not found or validation error
        logger.error(f"[{generation_id}] Validation error: {e}")
        jobs[generation_id]["status"] = "failed"
        jobs[generation_id]["error"] = str(e)
    except Exception as e:
        # Unexpected error
        logger.error(f"[{generation_id}] Generation failed: {e}", exc_info=True)
        jobs[generation_id]["status"] = "failed"
        jobs[generation_id]["error"] = str(e)


@app.route("/interactive/status/<generation_id>", methods=["GET"])
def get_status(generation_id: str):
    """
    Get generation status.
    
    Response:
    {
        "status": "queued" | "spec" | "building" | "publishing" | "done" | "failed",
        "preview_url": "string (if done)",
        "source_url": "string (if done)",
        "error": "string (if failed)"
    }
    """
    if generation_id not in jobs:
        logger.warning(f"Status requested for unknown generation_id: {generation_id}")
        return jsonify({"error": "Generation not found"}), 404
    
    job = jobs[generation_id]
    response = {
        "status": job["status"]
    }
    
    if job["status"] == "done":
        response["preview_url"] = job.get("preview_url")
        response["source_url"] = job.get("source_url")
    elif job["status"] == "failed":
        response["error"] = job.get("error", "Unknown error")
    
    return jsonify(response)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5002))
    logger.info(f"Starting Interactive Pages API server on port {port}")
    app.run(debug=True, host="127.0.0.1", port=port)
