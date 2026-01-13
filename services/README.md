# Services

This directory contains isolated microservices for the SMRTR platform.

---

## Available Services

### 🎙️ Chatterbox TTS (`chatterbox_tts/`)

**Purpose:** Self-hosted text-to-speech service using [Chatterbox-Turbo](https://github.com/resemble-ai/chatterbox)

**Use Cases:**
- Alternative to Google Cloud TTS for podcast generation
- Voice cloning for custom TTS
- High-volume TTS (cost-effective at scale)

**Status:** ✅ Production-ready

**Deployment:** RunPod Pods or Serverless

**Quick Start:**
```bash
# Initialize submodules
git submodule update --init --recursive

# Test locally (CPU)
docker build -f services/chatterbox_tts/Dockerfile.cpu -t chatterbox-tts:cpu .
docker run -p 8000:8000 chatterbox-tts:cpu

# Health check
curl http://localhost:8000/health
```

**Documentation:**
- [README](./chatterbox_tts/README.md) - Full documentation
- [DEPLOYMENT_GUIDE](./chatterbox_tts/DEPLOYMENT_GUIDE.md) - Quick deployment guide

---

## Adding New Services

When adding a new service to this directory:

1. **Create service directory:** `services/new_service/`
2. **Include:**
   - `README.md` - Service documentation
   - `Dockerfile` - Container definition
   - `requirements.txt` or `package.json` - Dependencies
   - `app/` or `src/` - Source code
   - `examples/` - Usage examples
3. **Update this README** with service info

### Service Structure Template

```
services/new_service/
├── app/
│   └── main.py (or index.ts)
├── examples/
│   ├── request.json
│   └── test.sh
├── Dockerfile
├── Dockerfile.cpu (optional)
├── requirements.txt (or package.json)
├── .gitignore
├── README.md
└── DEPLOYMENT_GUIDE.md
```

---

## Architecture Principles

Services in this directory should be:

✅ **Isolated** - No direct dependencies on main app code  
✅ **Dockerized** - Deployable via containers  
✅ **Documented** - Clear README with examples  
✅ **Tested** - Include test scripts  
✅ **Deployable** - Can run standalone on any platform  

---

## External Dependencies

Some services may use git submodules for external libraries:

```bash
# Always initialize submodules after clone
git submodule update --init --recursive
```

Current submodules:
- `external/chatterbox` - Used by `chatterbox_tts/`

---

## Integration with Main App

Services can be integrated with the main SMRTR app in several ways:

1. **Supabase Edge Functions** - Call service via HTTP
2. **React Native App** - Direct API calls
3. **Backend Functions** - Use as external API

Example integration:
```typescript
// In Supabase Edge Function
const ttsResponse = await fetch(
  "https://your-service.runpod.net/tts",
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "Hello world" })
  }
);
```

---

## Deployment Platforms

Common platforms for deploying these services:

- **RunPod** - GPU-accelerated ML services (chatterbox_tts)
- **Fly.io** - General web services
- **Railway** - Quick deployments
- **DigitalOcean** - Traditional VPS
- **AWS/GCP** - Enterprise scale

---

## Contributing

When contributing a new service:

1. Follow the structure template above
2. Add comprehensive documentation
3. Include Docker setup
4. Provide usage examples
5. Update this README

---

## Questions?

Open an issue in the main repo for service-related questions.
