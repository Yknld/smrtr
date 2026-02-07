# Recording Your Own Voice Samples for Podcast TTS

The podcast uses **Chatterbox Multilingual TTS** on RunPod. Speaker A (host) and Speaker B (co-host) are driven by two reference audio files. You can replace them with **2 recordings of your own voice**.

## How the sample voice is used

- **Where**: The RunPod container has reference files at `/app/runpod/male_en.flac` and `/app/runpod/female_en.flac`. They are copied from this repo at build time: `services/chatterbox_tts_multilingual/runpod/`.
- **Podcast mapping**: The Edge Function `podcast_generate_audio` sends:
  - **Speaker A** → `voice: "/app/runpod/male_en.flac"`
  - **Speaker B** → `voice: "/app/runpod/female_en.flac"`
- **Model**: Chatterbox uses these as “voice clones”: it generates speech that matches the tone and character of each reference clip.

## What to record (2 snippets)

1. **Length**: **At least 5 seconds** per clip (Chatterbox requirement). **8–15 seconds** is better.
2. **Format**: WAV or FLAC. FLAC is preferred (smaller, lossless).
3. **Quality**: Quiet room, minimal background noise, clear speech.
4. **Content**: Natural speech (e.g. read a short paragraph or explain something in 1–2 sentences). Avoid music or effects.

You can use:
- **Voice 1** → will replace **Speaker A (host)** → save as `male_en.flac`
- **Voice 2** → will replace **Speaker B (co-host)** → save as `female_en.flac`

(File names are by convention; use one voice per file.)

## Step 1: Record

**Quick UI (browser):** Open `services/chatterbox_tts_multilingual/record_voices.html` in Chrome or Safari (e.g. drag the file into the browser, or run a local server). Record Voice 1 and Voice 2, then download **male_en.wav** and **female_en.wav**. Skip to Step 2 to convert to FLAC.

**Other options:**
- **Phone**: Voice Memos (iOS) or Recorder (Android). Export/share the file.
- **Mac**: QuickTime Player → File → New Audio Recording. Save as M4A or WAV.
- **Other**: Any app that gives you WAV, M4A, or MP3.

Record **two separate clips** (one for each speaker).

## Step 2: Convert to FLAC (if needed)

If your recordings are M4A, MP3, etc., convert to mono FLAC (24 kHz is fine; the model resamples):

```bash
# Voice 1 → Speaker A (host)
ffmpeg -i your_voice1.m4a -ar 24000 -ac 1 -y services/chatterbox_tts_multilingual/runpod/male_en.flac

# Voice 2 → Speaker B (co-host)
ffmpeg -i your_voice2.m4a -ar 24000 -ac 1 -y services/chatterbox_tts_multilingual/runpod/female_en.flac
```

If the files are already WAV:

```bash
ffmpeg -i your_voice1.wav -ar 24000 -ac 1 -y services/chatterbox_tts_multilingual/runpod/male_en.flac
ffmpeg -i your_voice2.wav -ar 24000 -ac 1 -y services/chatterbox_tts_multilingual/runpod/female_en.flac
```

Run these from the **smrtr repo root** so the path `services/chatterbox_tts_multilingual/runpod/` is correct.

## Step 3: Replace the files in the repo

Copy (or move) your two FLAC files into:

- `services/chatterbox_tts_multilingual/runpod/male_en.flac`   → Speaker A
- `services/chatterbox_tts_multilingual/runpod/female_en.flac` → Speaker B

Overwrite the existing files. No code changes are needed; the Edge Function already points to these paths on the RunPod container.

## Step 4: Rebuild and deploy RunPod

The RunPod image must be rebuilt so the new FLACs are inside the container.

**If your RunPod/Hugging Face template is connected to this repo:** set **Branch** to `main`, **Dockerfile path** to `services/chatterbox_tts_multilingual/Dockerfile`, and **Build context** to `.` (repo root). A root `Dockerfile` does not exist; the TTS image is built from the path above.

```bash
# From repo root; build the image that RunPod uses (adjust image name if yours differs)
docker build -f services/chatterbox_tts_multilingual/Dockerfile -t your-registry/chatterbox-tts-multilingual:latest .
docker push your-registry/chatterbox-tts-multilingual:latest
```

Then in RunPod, deploy or update the serverless endpoint so it uses the new image. The endpoint ID used by the app is in `study-os-mobile/supabase/functions/podcast_generate_audio/index.ts` (`RUNPOD_ENDPOINT_ID`).

## Summary

| Step | Action |
|------|--------|
| 1 | Record 2 clips (≥5 s each, clean speech). |
| 2 | Convert to FLAC (e.g. with the `ffmpeg` commands above). |
| 3 | Replace `runpod/male_en.flac` and `runpod/female_en.flac` in `services/chatterbox_tts_multilingual/runpod/`. |
| 4 | Rebuild and push the Docker image; update the RunPod endpoint. |

After that, the next podcast you generate will use your two voice snippets as the sample voices for the two speakers.
