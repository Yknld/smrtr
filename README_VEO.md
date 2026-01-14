# Veo API Integration

## Quick Start

1. **Set your Veo API key:**
   ```bash
   export VEO_API_KEY="your_api_key_here"
   ```

2. **Run the app:**
   ```bash
   ./start.sh
   ```

3. **Generate videos:** The app will automatically use Veo if the API key is set, otherwise it falls back to local generation.

## How It Works

### Automatic Veo Detection

The app checks for `VEO_API_KEY` environment variable:
- ✅ **If set**: Uses Veo API for high-quality video generation with audio
- ⚠️ **If not set**: Falls back to local video generation (still works!)

### Veo Integration Flow

1. **Storyboard Generation** → Creates scene-by-scene plan
2. **Veo Job Specs** → Converts storyboard to Veo API format
3. **Image Generation** → Creates input images for each scene
4. **Veo API Calls** → Sends images + prompts to Veo
5. **Video Assembly** → Combines all scene videos into final video

### What Veo Provides

- ✅ **High-quality animations** from static images
- ✅ **Audio generation** (narration + ambient sound)
- ✅ **Smooth camera movements** (zooms, pans)
- ✅ **Professional output** matching educational style

### Local Fallback

If Veo is unavailable, the system uses:
- PIL (Python Imaging Library) for visuals
- imageio for video assembly
- Basic animations and text overlays

## API Configuration

### Option 1: Environment Variable (Recommended)
```bash
export VEO_API_KEY="your_key_here"
```

### Option 2: .env File
Create `.env` file:
```
VEO_API_KEY=your_key_here
```

### Option 3: In Code (Not Recommended)
Edit `veo_integration.py` directly (not recommended for production).

## Testing Veo Integration

```bash
# Check if Veo is available
python3 -c "from veo_integration import VeoIntegration; v = VeoIntegration(); print('Available:', v.available)"

# Test with a storyboard
python3 -c "
import json
from veo_integration import generate_with_veo

storyboard = json.load(open('test_storyboard.json'))
veo_jobs = json.load(open('test_veo_jobs.json'))

try:
    output = generate_with_veo(storyboard, veo_jobs, 'exports/test_veo.mp4')
    print('✅ Veo video:', output)
except Exception as e:
    print('❌ Error:', e)
"
```

## Troubleshooting

### "Veo API key not found"
- Set `VEO_API_KEY` environment variable
- Or create `.env` file with your key

### "Veo API error: 403"
- Check API key is correct
- Ensure Veo API is enabled in Google Cloud Console
- Verify you have access (Veo is in limited preview)

### "Veo API error: 429"
- Rate limit exceeded
- Wait a few minutes and try again
- Check your quota in Google Cloud Console

### "Job timeout"
- Video generation takes 2-5 minutes per scene
- Increase `max_wait` in `veo_integration.py` if needed
- Check job status manually via Google Cloud Console

### Videos not combining
- Ensure `ffmpeg` is installed: `brew install ffmpeg`
- Check `exports/temp_veo/` directory for individual scene videos

## Cost & Limits

- Veo API may have usage limits and costs
- Check [Google Cloud Pricing](https://cloud.google.com/pricing) for details
- Local generation is free but less sophisticated

## Files

- `veo_client.py` - Basic Veo API client
- `veo_integration.py` - Complete integration with image generation and video assembly
- `app.py` - Web app with automatic Veo detection
- `VEO_SETUP.md` - Detailed setup guide
