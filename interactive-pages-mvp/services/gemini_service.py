"""
Gemini 3 API service for generating interactive page specs.
"""
import json
import os
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiService:
    """Service for interacting with Gemini 3 API."""
    
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def generate_spec(self, title: str, transcript: str = "", 
                     summary: str = "", user_feedback: str = None) -> dict:
        """
        Generate JSON spec for interactive page using prompt template.
        
        Args:
            title: Lesson title
            transcript: Full transcript text
            summary: Lesson summary
            user_feedback: Optional user feedback for regeneration
            
        Returns:
            JSON spec dict
        """
        # Load prompt template
        prompt_template_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "prompts",
            "gemini_spec.txt"
        )
        
        try:
            with open(prompt_template_path, 'r') as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template not found: {prompt_template_path}")
            raise RuntimeError("Prompt template file not found")
        
        # Replace template variables
        prompt = prompt_template.replace("{{TITLE}}", title)
        prompt = prompt.replace("{{SUMMARY}}", summary or "No summary provided")
        prompt = prompt.replace("{{TRANSCRIPT}}", transcript or "No transcript provided")
        prompt = prompt.replace("{{FEEDBACK}}", user_feedback or "")
        
        logger.info(f"Generating spec for lesson: {title}")
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            spec = json.loads(response_text)
            
            # Validate spec structure
            self._validate_spec(spec)
            
            logger.info(f"Successfully generated spec with {len(spec.get('scenes', []))} scenes")
            return spec
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            raise ValueError(f"Failed to parse Gemini response as JSON: {e}")
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise RuntimeError(f"Gemini API error: {e}")
    
    def _validate_spec(self, spec: dict):
        """Validate spec has required fields matching new schema."""
        # Check meta
        if "meta" not in spec:
            raise ValueError("Spec missing required field: meta")
        if "title" not in spec["meta"]:
            raise ValueError("Spec meta missing required field: title")
        
        # Check scenes
        if "scenes" not in spec:
            raise ValueError("Spec missing required field: scenes")
        if not isinstance(spec["scenes"], list):
            raise ValueError("Spec scenes must be a list")
        if len(spec["scenes"]) < 2 or len(spec["scenes"]) > 4:
            raise ValueError("Spec must have 2-4 scenes")
        
        # Check minigame
        if "minigame" not in spec:
            raise ValueError("Spec missing required field: minigame")
        
        # Check quiz
        if "quiz" not in spec:
            raise ValueError("Spec missing required field: quiz")
        if "questions" not in spec["quiz"]:
            raise ValueError("Spec quiz missing required field: questions")
        if len(spec["quiz"]["questions"]) != 4:
            raise ValueError("Spec quiz must have exactly 4 questions")
        
        # Check ending
        if "ending" not in spec:
            raise ValueError("Spec missing required field: ending")
