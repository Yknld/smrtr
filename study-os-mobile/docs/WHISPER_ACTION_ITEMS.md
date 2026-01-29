# Whisper Migration - Action Items

## ⚡ Quick Start (3 steps)

### 1️⃣ Get OpenAI API Key
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)

### 2️⃣ Set Secret & Deploy
```bash
cd /Users/danielntumba/smrtr/study-os-mobile

# Set the key
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Verify it was set
supabase secrets list | grep OPENAI

# Deploy updated function
cd backend/functions
./deploy.sh
```

### 3️⃣ Test
```bash
# Via mobile app (recommended)
# 1. Open your React Native app
# 2. Record some audio
# 3. Verify transcript appears

# OR via test script
cd backend/tests
./test-whisper.sh YOUR_USER_JWT
```

## 📋 Full Checklist

### Prerequisites ✅
- [x] Transcriber interface created
- [x] WhisperTranscriber implemented
- [x] transcribe_chunk updated
- [x] Documentation written
- [x] Test scripts created

### Your Action Items ⚠️
- [ ] Get OpenAI API key
- [ ] Set `OPENAI_API_KEY` secret in Supabase
- [ ] Deploy updated `transcribe_chunk` function
- [ ] Test via mobile app or curl
- [ ] Verify transcripts in database

### Success Indicators ✅
- [ ] Function deploys without error
- [ ] Audio chunk transcribes successfully
- [ ] `transcript_segments` populated
- [ ] `transcripts.full_text` updated
- [ ] `tail_text` returned for live captions
- [ ] No Gemini STT calls in logs

## 📚 Documentation

- **Architecture:** `backend/docs/transcription-provider.md`
- **Deployment:** `backend/docs/whisper-deployment.md`
- **Migration Summary:** `WHISPER_STT_MIGRATION_COMPLETE.md`
- **Test Script:** `backend/tests/test-whisper.sh`

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| "OPENAI_API_KEY not configured" | Run: `supabase secrets set OPENAI_API_KEY=sk-proj-...` |
| "Whisper API error: 401" | Invalid key - get new one from OpenAI dashboard |
| "Whisper API error: 429" | Rate limit - wait 60s or upgrade plan |
| Empty transcript | Check audio file, storage path, function logs |

## 💰 Cost Monitor

- **Pricing:** $0.006/minute
- **Example:** 10-min session = $0.06
- **Dashboard:** https://platform.openai.com/usage

## 🎯 Why This Change?

| Aspect | Gemini Live | Whisper |
|--------|-------------|---------|
| **Reliability** | ❌ v1alpha, unstable | ✅ Production-stable |
| **Complexity** | ❌ WebSocket + tokens | ✅ Simple HTTP |
| **Audio Format** | ❌ PCM16 only | ✅ Accepts m4a |
| **Latency** | ⚡ Real-time | ⚡ Fast chunks |
| **Cost** | 🤔 Complex pricing | 💵 $0.006/min |
| **Use Case** | Streaming | ✅ Chunks |

**Decision:** Use Whisper for STT, save Gemini for text processing (summaries, flashcards, Q&A).

## 🚀 Next Steps After MVP

Once Whisper is working:
- [ ] Add Gemini for summaries/flashcards
- [ ] Consider speaker diarization (AssemblyAI)
- [ ] Add word-level timestamps
- [ ] A/B test providers for accuracy

---

**Ready?** Set the key and deploy! 🎉

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
cd backend/functions && ./deploy.sh
```
