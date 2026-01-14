# Getting Proper Voice Samples for Distinct Male/Female Voices

## Current Issue
Both podcast hosts sound the same (female) because we're using Chatterbox TTS default voice without reference audio.

## Why Voice Cloning Isn't Working
Current reference files are **too short**:
- `female_en.flac`: 3.0 seconds  
- `male_en.flac`: 3.3 seconds

**Chatterbox TTS requires ≥5 seconds** for voice cloning.

## Solution: Get Proper Voice Samples

### Requirements
- **Duration**: 5-10 seconds each
- **Format**: WAV or FLAC (16kHz or 24kHz recommended)
- **Quality**: Clean audio, no background noise
- **Content**: Natural speech (not reading, but conversational)

### Option 1: Generate with ElevenLabs/Other TTS
1. Go to https://elevenlabs.io (or similar)
2. Generate two 10-second voice samples:
   - **Female**: Professional, warm, clear
   - **Male**: Professional, clear, slightly deeper
3. Download as WAV or FLAC
4. Save as:
   - `/services/chatterbox_tts/runpod/female_en.flac`
   - `/services/chatterbox_tts/runpod/male_en.flac`

### Option 2: Record Real Voices
1. Record 10 seconds of someone reading naturally
2. Use QuickTime/Voice Memos on Mac
3. Convert to FLAC:
   ```bash
   ffmpeg -i input.m4a -ar 24000 -ac 1 output.flac
   ```

### Option 3: Use Free Voice Datasets
Sources:
- LibriVox audiobooks (public domain)
- Common Voice dataset
- YouTube (with permission)

Extract 10-second clips with:
```bash
ffmpeg -i input.mp3 -ss 00:00:10 -t 10 -ar 24000 -ac 1 output.flac
```

## After Getting Samples

1. **Replace the files**:
   ```bash
   cp new_female_voice.flac services/chatterbox_tts/runpod/female_en.flac
   cp new_male_voice.flac services/chatterbox_tts/runpod/male_en.flac
   ```

2. **Update edge function config**:
   ```typescript
   const VOICE_CONFIG = {
     a: {
       speed: 1.0,
       voice: "/app/runpod/female_en.flac",
       description: "Host (Speaker A - Female)"
     },
     b: {
       speed: 1.05,
       voice: "/app/runpod/male_en.flac",
       description: "Co-host (Speaker B - Male)"
     },
   };
   ```

3. **Rebuild and deploy**:
   ```bash
   cd services/chatterbox_tts
   # Start Docker first
   docker build -t registry.runpod.net/yknld-smrtr-main-services-chatterbox-tts-dockerfile:latest -f Dockerfile .
   docker push registry.runpod.net/yknld-smrtr-main-services-chatterbox-tts-dockerfile:latest
   ```

4. **Redeploy edge function**:
   ```bash
   cd study-os-mobile
   npx supabase functions deploy podcast_generate_audio --no-verify-jwt
   ```

## Temporary Workaround
For now, both hosts use the same default voice with slight speed difference (1.0x vs 1.05x). The paralinguistic tags ([laugh], [chuckle], etc.) help add variety.

## Expected Result
With proper 5+ second voice samples, you'll get:
- ✅ Distinct male and female voices
- ✅ Natural voice cloning from the samples
- ✅ Better personality and warmth in the podcast
