# Quick Reference

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_key
RUNPOD_API_KEY=your_key
RUNPOD_ENDPOINT_ID=your_endpoint_id
GITHUB_TOKEN=your_token

# Optional
GITHUB_REPO=org/repo-name  # For repo publishing (else uses Gists)
GITHUB_BRANCH=main
PORT=5002
```

## API Usage Example

```python
import requests

# Generate
response = requests.post("http://127.0.0.1:5002/interactive/generate", json={
    "title": "My Lesson",
    "transcript": "Lesson content here...",
    "key_concepts": ["Concept 1", "Concept 2"]
})

job_id = response.json()["job_id"]

# Check status
status = requests.get(f"http://127.0.0.1:5002/interactive/status/{job_id}")
print(status.json())
```

## Testing

```bash
# Start server
./start.sh

# In another terminal
python test_client.py
```

## Troubleshooting

- **"GEMINI_API_KEY is required"**: Copy `env.example` to `.env` and fill in keys
- **"RunPod API error"**: Check your RunPod endpoint is running and accessible
- **"GitHub API error"**: Verify token has correct scopes (`repo` or `gist`)
- **Port 5002 in use**: Change `PORT` in `.env` or `api/server.py`
