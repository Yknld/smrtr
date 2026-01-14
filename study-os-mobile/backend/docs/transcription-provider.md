# Transcription Provider Architecture

**Last Updated:** January 2026

## Overview

This document describes our transcription provider architecture and why we chose specific services for different use cases.

## Current Architecture

### Speech-to-Text (STT): OpenAI Whisper
- **Provider:** OpenAI Whisper API
- **Model:** `whisper-1`
- **Use Case:** Converting audio chunks to text
- **Integration:** Chunk-based transcription via Edge Functions

### Language Tasks: Gemini (Future)
- **Provider:** Google Gemini API
- **Use Cases:** 
  - Text summarization
  - Flashcard generation
  - Q&A generation
  - Study notes enhancement
- **Status:** Not yet implemented

## Why Whisper for STT?

### ✅ Reliability
- Production-ready, battle-tested API
- High accuracy for English and multiple languages
- Robust error handling and retry support

### ✅ Simplicity
- Simple HTTP REST API (multipart/form-data)
- No WebSocket complexity
- Easy to test and debug

### ✅ Cost-Effective
- Pay-per-minute pricing ($0.006/minute)
- No idle costs
- No infrastructure to manage

### ✅ Format Flexibility
- Accepts multiple audio formats (m4a, mp3, wav, etc.)
- No complex audio preprocessing required
- Handles variable quality audio

### ✅ MVP Speed
- Quick integration (< 2 hours)
- No custom infrastructure
- Proven in production by thousands of apps

## Why NOT Gemini Live for STT?

Gemini Live API is powerful but has MVP blockers:

### ❌ WebSocket Complexity
- Requires persistent connection management
- Complex error handling (codes 1007, 1008)
- Base64 audio encoding overhead
- Connection state management

### ❌ Audio Format Requirements
- Requires PCM16 LE mono 16kHz
- Client-side audio preprocessing needed
- Binary data streaming complexity

### ❌ Token Management
- Ephemeral tokens with short expiry
- Token refresh logic required
- Additional Edge Function overhead

### ❌ Documentation Gaps
- Limited error message clarity
- v1alpha API instability
- Fewer community resources

## Architecture Abstraction

We've built a provider abstraction layer (`Transcriber` interface) to allow future flexibility:

```typescript
export interface Transcriber {
  transcribeAudio(
    audioBuffer: Uint8Array,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>;
}
```

### Current Implementation: WhisperTranscriber
- Located: `backend/lib/transcription/WhisperTranscriber.ts`
- Uses OpenAI Whisper API
- Returns text + optional confidence/metadata

### Future Implementations
- Could add: AssemblyAI, Deepgram, Rev.ai, etc.
- Swap providers without changing business logic
- A/B test providers for accuracy/cost

## Integration Points

### Edge Function: transcribe_chunk
- Receives audio chunk upload
- Downloads audio from Supabase Storage
- Calls WhisperTranscriber
- Merges result with overlap deduplication
- Updates transcript in database
- Returns tail_text for live captions

### No Changes Required
- ✅ Database schema unchanged
- ✅ RLS policies unchanged
- ✅ API contracts unchanged
- ✅ Mobile client unchanged

## Cost Estimates (Rough)

### Whisper API Pricing
- **Rate:** $0.006 per minute
- **Example:** 10-minute recording = $0.06
- **Monthly (100 sessions @ 10min each):** ~$6

### Gemini (for future language tasks)
- **Rate:** $0.00025 per 1K input tokens
- **Example:** Summarize 10K tokens = $0.0025
- **Much cheaper for text processing vs. audio**

## Configuration

### Required Secrets (Supabase)
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### Future Secrets
```bash
supabase secrets set GEMINI_API_KEY=...
```

## Migration Path

If we want to switch providers later:

1. Create new `Transcriber` implementation (e.g., `AssemblyAITranscriber`)
2. Update import in `transcribe_chunk/index.ts`
3. Add new API key to Supabase secrets
4. Test and deploy
5. No client-side changes needed

## Testing Strategy

### Unit Tests
- Test `WhisperTranscriber` with sample audio
- Mock Whisper API responses
- Verify error handling

### Integration Tests
- End-to-end chunk upload → transcription
- Verify transcript merging
- Test idempotency

### Manual Testing
- Upload real audio via mobile app
- Verify transcript accuracy
- Check tail_text for live captions

## Future Considerations

### When to Revisit Gemini Live
- If we need **true real-time** streaming (< 200ms latency)
- If Gemini Live exits beta and stabilizes
- If WebSocket overhead becomes acceptable
- If we need multilingual streaming

### When to Keep Whisper
- Chunk-based transcription is sufficient
- Simplicity is more important than latency
- Cost remains competitive
- Accuracy meets requirements

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| Jan 2026 | Use Whisper for STT | MVP reliability and simplicity |
| Jan 2026 | Abstract provider interface | Future flexibility |
| Jan 2026 | Reserve Gemini for language tasks | Better fit for text processing |

## References

- [OpenAI Whisper API Docs](https://platform.openai.com/docs/api-reference/audio/createTranscription)
- [Gemini Live API Docs](https://ai.google.dev/api/generate-content#live-api)
- Our implementation: `/backend/lib/transcription/`
