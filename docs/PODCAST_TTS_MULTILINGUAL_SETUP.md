# Podcast TTS Multilingual Setup

## ✅ What Was Done

### 1. Created Dedicated Multilingual TTS Endpoint
- **Repo:** `https://github.com/Yknld/chatterbox-multilingual-runpod`
- **Endpoint ID:** `f1hyps48e61yf7`
- **Model:** Chatterbox Multilingual TTS (23 languages)

### 2. Added Natural Voice Samples
**English:**
- 🎙️ Male: `male_en.flac` (8.9s, natural human voice)
- 🎙️ Female: `female_en.flac` (8.0s, natural human voice)

**Russian:**
- 🎙️ Female: `russian_voice.flac` (10s, from YouTube sample)

### 3. Updated Podcast Generation Function
**File:** `study-os-mobile/supabase/functions/podcast_generate_audio/index.ts`

**Changes:**
- ✅ Endpoint changed from Turbo → Multilingual
- ✅ Speaker A (host) → Male voice
- ✅ Speaker B (co-host) → Female voice
- ✅ Language support added (reads from `episode.language`)
- ✅ Exaggeration parameter kept for natural podcast speech

## 🚀 Deployment Steps

### Step 1: Deploy Supabase Edge Function
```bash
cd /Users/danielntumba/smrtr/study-os-mobile
npx supabase functions deploy podcast_generate_audio
```

### Step 2: Verify Secrets (Already Set)
```bash
npx supabase secrets list
```

Should show:
- `RUNPOD_API_KEY` = `rpa_W1DVM54FQQC07CK8J6UX2BA6N8TZ3WSSTJ140J2Vbpln68`

### Step 3: Wait for RunPod to Rebuild (Already Done)
The multilingual endpoint `f1hyps48e61yf7` is already built and running with the new voices.

### Step 4: Test
Generate a new podcast to test the new voices:
```bash
# The existing podcast generation flow will automatically use:
# - Male voice for host (Speaker A)
# - Female voice for co-host (Speaker B)
# - Language from episode.language field
```

## 📊 Performance

### Generation Times
- **Per sentence:** ~4-5 seconds
- **Cached requests:** ~45ms (100x faster)

### Comparison
| Model | Speed | Languages | Voices |
|-------|-------|-----------|--------|
| **Turbo** | ~100ms | English only | Default |
| **Multilingual** | ~4500ms | 23 languages | Custom (male/female) |

**Trade-off:** 45x slower but supports multiple languages and custom voices.

## 🎯 Voice Usage in Code

The podcast generation automatically uses:

```typescript
const VOICE_CONFIG = {
  a: {
    voice: "/app/runpod/male_en.flac",    // Host (male)
    description: "Host (Speaker A - Male Voice)"
  },
  b: {
    voice: "/app/runpod/female_en.flac",  // Co-host (female)
    description: "Co-host (Speaker B - Female Voice)"
  },
};
```

## 🌍 Supported Languages

Arabic (ar), Danish (da), German (de), Greek (el), **English (en)**, Spanish (es), 
Finnish (fi), French (fr), Hebrew (he), Hindi (hi), Italian (it), Japanese (ja), 
Korean (ko), Malay (ms), Dutch (nl), Norwegian (no), Polish (pl), Portuguese (pt), 
**Russian (ru)**, Swedish (sv), Swahili (sw), Turkish (tr), Chinese (zh)

## 📝 Adding More Languages

To add voices for other languages (e.g., Spanish, French):

1. Get 5-10s audio sample of natural human speech
2. Convert to FLAC:
   ```bash
   ffmpeg -i input.mp3 -t 8 -ac 1 -ar 24000 male_es.flac
   ```
3. Add to `chatterbox-multilingual-runpod/runpod/`
4. Commit and push to trigger rebuild
5. Update `VOICE_CONFIG` if needed

## 🔗 Resources

- Multilingual Repo: https://github.com/Yknld/chatterbox-multilingual-runpod
- Voice Usage Guide: `chatterbox-multilingual-runpod/VOICE_USAGE.md`
- RunPod Endpoint: https://console.runpod.io/serverless/user/endpoint/f1hyps48e61yf7

## ✅ Status

- [x] Multilingual model deployed
- [x] English male/female voices added
- [x] Russian female voice added  
- [x] Podcast function updated
- [ ] **Deploy edge function** (npx supabase functions deploy)
- [ ] Test with new podcast generation
