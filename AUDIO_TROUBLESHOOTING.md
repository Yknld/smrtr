# Audio Troubleshooting Guide

## Issue: No Audio in Veo Videos

If your Veo-generated videos don't have audio, here are the steps to diagnose and fix:

### 1. Check Veo Model Version

Veo 3.1 models support audio generation, but Veo 3 may not. The system automatically tries:
- `veo-3.1-generate-preview` (supports audio) ✅
- Falls back to `veo-3` if 3.1 not available ⚠️

### 2. Verify Audio Prompt Format

The `audio_prompt` must be explicit. Check that it includes:
- Clear instruction to generate audio
- Narration text
- Voice style description
- Ambient sound instructions

Example good audio prompt:
```
Generate audio with a clear teacher voice speaking: 'Your narration text here'. 
The voice should be calm, measured, and professional. 
Add a very subtle, low-volume ambient background sound.
```

### 3. Check Video File for Audio Track

After downloading, the system checks if audio exists:

```bash
# Manual check
ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 your_video.mp4
```

If this returns nothing, the video has no audio track.

### 4. Debug Steps

1. **Check API Response**: Look for `audio_url` or `audio_uri` in the Veo API response
2. **Check Downloaded Video**: Use `ffprobe` to verify audio track exists
3. **Check Audio Prompt**: Ensure it's being sent correctly to Veo API
4. **Check Model**: Verify you're using Veo 3.1 (supports audio)

### 5. Common Issues

**Issue**: Veo API returns video but no audio
- **Cause**: Model doesn't support audio or audio_prompt format incorrect
- **Fix**: Use Veo 3.1 model, improve audio_prompt clarity

**Issue**: Video has audio but it's silent
- **Cause**: Audio track exists but volume is zero or audio is empty
- **Fix**: Check audio levels, verify audio_prompt requested actual sound

**Issue**: Audio cuts off early
- **Cause**: Narration shorter than video duration
- **Fix**: Audio prompt should request ambient continuation

### 6. Manual Testing

Test audio generation:

```python
from veo_integration import VeoIntegration

veo = VeoIntegration()
# Check if video has audio
has_audio = veo._check_video_has_audio('path/to/video.mp4')
print(f"Has audio: {has_audio}")
```

### 7. Fallback Solution

If Veo doesn't generate audio, you can:
1. Use local TTS (text-to-speech) to generate narration
2. Add ambient sound separately
3. Combine with ffmpeg

### 8. API Parameters

Current audio-related parameters sent to Veo:
- `audio_prompt`: Detailed instruction for audio generation
- `generate_audio`: True (may not be supported by all models)
- `audio_style`: "narration_with_ambient" (may not be supported)

**Note**: The `audio_prompt` is the most important parameter. Other flags may not be supported by all Veo API versions.

### 9. Next Steps

If audio still doesn't work:
1. Check Veo API documentation for your specific API version
2. Verify your API key has access to Veo 3.1
3. Try a simpler audio_prompt to test
4. Contact Google Cloud support for Veo API issues
