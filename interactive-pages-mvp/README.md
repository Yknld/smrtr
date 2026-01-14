# Interactive Pages MVP

A feature for generating self-contained interactive HTML pages from lesson content.

## Architecture

```
Client -> Backend API -> Gemini 3 (spec) -> OpenHands/RunPod (HTML) -> GitHub -> Link
```

## Quick Start

1. **Setup environment:**
```bash
cp env.example .env
# Edit .env and add your API keys
```

2. **Start the server:**
```bash
./start.sh
# Or manually:
# python3 -m venv venv
# source venv/bin/activate
# pip install -r requirements.txt
# python api/server.py
```

3. **Test it:**
```bash
python test_client.py
```

## Setup Details

### Required Environment Variables

Copy `env.example` to `.env` and fill in:

1. **GEMINI_API_KEY** - Google AI Studio API key
   - Get from: https://aistudio.google.com/app/apikey

2. **RUNPOD_OPENHANDS_URL** - Your OpenHands endpoint URL
   - Format: `https://your-endpoint.runpod.io/api/v1/generate`
   - Get from: https://www.runpod.io/

3. **RUNPOD_API_KEY** - RunPod API key (if required by your endpoint)
   - Get from: https://www.runpod.io/

4. **GITHUB_TOKEN** - GitHub personal access token
   - Create at: https://github.com/settings/tokens
   - Needs `repo` scope (for Pages) or `gist` scope (for Gists)

5. **GITHUB_PAGES_REPO** - GitHub repo for Pages (optional)
   - Format: `username/repo-name`
   - If set, publishes to `/pages/<generation_id>/index.html`
   - If not set, uses GitHub Gists

6. **GITHUB_OWNER** - GitHub username/org (optional, for Pages URLs)

7. **PORT** - Server port (default: 5002)

## API Endpoints

### `POST /interactive/generate`

Generate an interactive page from lesson content.

**Request:**
```json
{
  "lesson_id": "lesson_1",
  "user_feedback": "optional feedback string",
  "mode": "new" | "regen"
}
```

**Response (202 Accepted):**
```json
{
  "generation_id": "uuid"
}
```

### `GET /interactive/status/<generation_id>`

Check generation status.

**Response:**
```json
{
  "status": "queued" | "spec" | "building" | "publishing" | "done" | "failed",
  "preview_url": "https://...",  // if done
  "source_url": "https://...",   // if done
  "error": "error message"       // if failed
}
```

## Constraints & Validation

The generated HTML must:
- ✅ Be a single self-contained file (inline CSS + JS)
- ✅ Have no external scripts, images, or network calls
- ✅ Be mobile-friendly (responsive design)
- ✅ Include: progress indicator, 2-4 scenes, 1 mini-game, 1 quiz, reset button
- ✅ Be under 1.5 MB in size
- ❌ No `<script src=`, `fetch()`, `XMLHttpRequest`, `eval()`, etc.

## Project Structure

```
interactive-pages-mvp/
├── api/
│   └── server.py          # Flask API server
├── services/
│   ├── gemini_service.py  # Gemini 3 integration
│   ├── runpod_service.py # RunPod/OpenHands integration
│   ├── github_service.py  # GitHub publishing
│   └── metadata_store.py # Simple metadata storage
├── prompts/
│   ├── gemini_spec_prompt.py  # Prompt for spec generation
│   └── openhands_prompt.py    # Prompt for HTML generation
├── utils/
│   ├── rate_limiter.py   # Rate limiting
│   └── html_validator.py  # HTML validation
├── generated/            # Generated files (gitignored)
└── test_client.py        # Test client
```

## Rate Limiting

- Default: 10 requests per 60 seconds per user
- Configurable in `api/server.py`

## Notes

- This is an MVP - uses in-memory job storage
- For production, consider:
  - Database for job storage
  - Proper async task queue (Celery, RQ)
  - Supabase or other database for metadata
  - Better error handling and retries
