# Chatterbox TTS Multilingual Service

FastAPI-based TTS service using Chatterbox Multilingual model - supports 23 languages.

## Features

- **23 Languages**: English, Spanish, French, German, Russian, Chinese, Japanese, Korean, and more
- **Voice Cloning**: Use reference audio to clone voices
- **Expressiveness Control**: Adjust emotional tone with `exaggeration` parameter (0.0-1.0)
- **FastAPI**: RESTful HTTP API
- **GPU Accelerated**: CUDA support for fast inference
- **Caching**: File and in-memory caching for repeated requests

## Docker Image

The image is automatically built by GitHub Actions and pushed to GitHub Container Registry:

```
ghcr.io/yknld/chatterbox-tts-multilingual:latest
```

## RunPod Deployment

1. **Create new endpoint** in RunPod
2. **Select template**: GPU (RTX 4090 or better recommended)
3. **Docker image**: `ghcr.io/yknld/chatterbox-tts-multilingual:latest`
4. **Container port**: 8000
5. **Health endpoint**: `/health`

## API Usage

### Endpoint

```
POST /tts
```

### Request Body

```json
{
  "text": "Hello world!",
  "language": "en",
  "voice": null,
  "format": "mp3",
  "speed": 1.0,
  "exaggeration": 0.7,
  "seed": null
}
```

### Parameters

- `text` (required): Text to synthesize (1-5000 characters)
- `language` (default: "en"): Language code (e.g., "en", "es", "fr", "de", "ru", "zh", "ja", "ko")
- `voice` (optional): Path to reference voice audio file for voice cloning
- `format` (default: "mp3"): Output format ("mp3" or "wav")
- `speed` (default: 1.0): Speech speed multiplier (0.5-2.0)
- `exaggeration` (default: 0.7): Expressiveness level (0.0-1.0, higher = more expressive)
- `seed` (optional): Random seed for reproducibility

### Example (curl)

```bash
curl -X POST "https://your-runpod-endpoint.com/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Привет, как дела?",
    "language": "ru",
    "exaggeration": 0.8
  }' \
  --output audio.mp3
```

### Example (Python)

```python
import requests

response = requests.post(
    "https://your-runpod-endpoint.com/tts",
    json={
        "text": "Bonjour, comment allez-vous?",
        "language": "fr",
        "exaggeration": 0.7,
        "format": "mp3"
    }
)

with open("audio.mp3", "wb") as f:
    f.write(response.content)
```

## Supported Languages

The multilingual model supports the following languages:

- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `ru` - Russian
- `zh` - Chinese (Mandarin)
- `ja` - Japanese
- `ko` - Korean
- `it` - Italian
- `pt` - Portuguese
- `pl` - Polish
- `nl` - Dutch
- `ar` - Arabic
- `hi` - Hindi
- `tr` - Turkish
- `sv` - Swedish
- `da` - Danish
- `no` - Norwegian
- `fi` - Finnish
- `cs` - Czech
- `el` - Greek
- `uk` - Ukrainian
- `th` - Thai

## Performance

- **First request**: ~10-15 seconds (cold start + generation)
- **Cached requests**: ~50-100ms
- **Generation time**: ~10 seconds per sentence (varies by GPU and text length)
- **VRAM usage**: ~8-10 GB

## Notes

- The multilingual model is slower than Turbo (10s vs 100ms) but supports 23 languages
- Higher `exaggeration` values (0.7-1.0) produce more natural, expressive speech
- Voice cloning requires reference audio >5 seconds in FLAC format
- Use `temperature=0.8` and `cfg_weight=0.5` for balanced quality

## Voice Files

Reference voices are included in `runpod/`:
- `host_voice.flac` - English male voice (8s)
- `russian_voice.flac` - Russian voice (12.9s)
- `female_en.flac` - English female voice
- `male_en.flac` - English male voice
