# Podcast Script Generation - Complete ✅

## What Was Built

An AI-powered script generation system that creates natural, podcast-style dialogues from lesson content using Gemini. The function generates a two-speaker conversation that gets straight to the point (NotebookLM style) with minimal fluff.

## Files Created

### Edge Function
- **`supabase/functions/podcast_generate_script/index.ts`** - Main script generation logic
- **`supabase/functions/podcast_generate_script/deno.json`** - Deno configuration
- **Status**: ✅ Deployed and live

### Documentation
- **`backend/tests/curl/podcast_generate_script.md`** - Complete API testing guide with 9 test cases

## How It Works

### Input
```json
{
  "episode_id": "uuid",
  "duration_min": 8,         // Optional: default 8 minutes
  "style": "direct_review"   // Optional: direct_review | friendly | exam
}
```

### Process Flow

1. **Verify Episode Ownership**
   - Fetch episode from `podcast_episodes`
   - Verify belongs to authenticated user (RLS)
   - Update status to `'scripting'`

2. **Gather Lesson Context** (Priority order)
   - ✅ **Best**: `lesson_outputs` where `type='summary'` and `status='ready'`
   - ✅ **Good**: Concatenate `live_transcript_segments` by seq
   - ✅ **Fallback**: Lesson title only
   - Cap at 12,000 characters

3. **Generate Script with Gemini**
   - Use `gemini-1.5-flash` (cost-efficient)
   - Enforce structured JSON output
   - Target ~8 segments per minute (64 segments for 8 min)
   - Short turns (1-3 sentences each)
   - Minimal intro (max 2 turns)
   - Direct content delivery
   - Clean wrap-up with encouraging close

4. **Save to Database**
   - Insert segments into `podcast_segments` with seq 1, 2, 3...
   - Each segment: `speaker='a'|'b'`, `text`, `tts_status='queued'`
   - Update episode: `title`, `total_segments`, `status='voicing'`

### Output
```json
{
  "episode_id": "uuid",
  "title": "Understanding Variables and Data Types",
  "total_segments": 64
}
```

## Script Generation Rules (NotebookLM Style)

### ✅ DO:
- **Get to the point fast** - No long intros
- **Short turns** - 1-3 sentences per speaker
- **Include examples** - 1-2 concrete examples per concept
- **Natural back-and-forth** - Conversational dialogue
- **Clean closing** - "Let's get back to it!" style

### ❌ DON'T:
- ❌ "Welcome to today's podcast..." long intros
- ❌ "Thanks for listening..." long outros
- ❌ Fluff or filler content
- ❌ Overly formal or academic tone
- ❌ Long monologues (keep it conversational)

## Style Options

### `direct_review` (Default)
- Direct and focused
- Get to point quickly
- Clear explanations with 1-2 examples
- Best for: Quick reviews, study prep

### `friendly`
- Warm, conversational tone
- Explain as if talking to a peer
- Relatable examples
- Best for: First-time learning, exploration

### `exam`
- Focus on exam preparation
- Emphasize key facts and definitions
- Include memory aids
- Highlight common pitfalls
- Best for: Test prep, memorization

## Testing

### Quick Test via curl

```bash
# 1. Get token
cd backend/tests
node get-token.js user1@test.com password123
export USER_TOKEN="..."

# 2. Create episode
export LESSON_ID="<your-lesson-id>"
RESPONSE=$(curl -s -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/podcast_create \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\": \"$LESSON_ID\"}")

export EPISODE_ID=$(echo $RESPONSE | jq -r '.episode_id')

# 3. Generate script
curl -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"episode_id\": \"$EPISODE_ID\",
    \"duration_min\": 8,
    \"style\": \"direct_review\"
  }"
```

### Verify in Database

```sql
-- Check episode was updated
SELECT id, status, title, total_segments
FROM podcast_episodes
WHERE id = '<episode-id>';

-- View segments in order
SELECT seq, speaker, LEFT(text, 60) || '...' as preview
FROM podcast_segments
WHERE episode_id = '<episode-id>'
ORDER BY seq;

-- Count segments
SELECT COUNT(*) as total
FROM podcast_segments
WHERE episode_id = '<episode-id>';
```

## Example Generated Script

### Input
- **Lesson**: "Introduction to Variables"
- **Duration**: 8 minutes
- **Style**: direct_review

### Output Sample
```json
{
  "title": "Variables 101: The Building Blocks",
  "segments": [
    {
      "speaker": "a",
      "text": "Let's talk variables. They're containers for storing data in your programs."
    },
    {
      "speaker": "b",
      "text": "Right. Think of them like labeled boxes. You give them a name and put something inside."
    },
    {
      "speaker": "a",
      "text": "Exactly. For example, 'age = 25' stores the number 25 in a box called age."
    },
    {
      "speaker": "b",
      "text": "And you can change what's in the box anytime. That's why it's called a variable - it varies!"
    },
    ...
    {
      "speaker": "a",
      "text": "And that's variables in a nutshell. Simple but powerful."
    },
    {
      "speaker": "b",
      "text": "Now go build something awesome with them!"
    }
  ]
}
```

Total: ~64 segments for 8 minutes

## Performance

**Expected Response Time:** 6-20 seconds
- Gemini API call: 5-15 seconds
- Context gathering: < 1 second
- Database writes: < 1 second

**Cost:** Very low (using Flash model)
- ~64 segments @ ~20 words each = ~1,280 words output
- Context input: ~3,000-12,000 chars
- Gemini Flash pricing: Extremely cheap

## Integration Status

### ✅ Complete
- [x] Edge Function deployed
- [x] Authentication with JWT
- [x] RLS enforcement
- [x] Context gathering (3 sources)
- [x] Gemini integration
- [x] Structured JSON output
- [x] Database writes (segments + episode)
- [x] Error handling
- [x] Status updates
- [x] Test documentation

### ⏳ Next Steps (Phase 3)
- [ ] Audio generation Edge Function
- [ ] TTS integration (Gemini, ElevenLabs, or Google)
- [ ] Upload audio to storage
- [ ] Update segment `tts_status` to 'ready'
- [ ] Update episode `status` to 'ready'

### 🔮 Future (Phase 4)
- [ ] Mobile app audio playback
- [ ] Queue management
- [ ] Transcript sync during playback
- [ ] Skip/seek functionality

## Current Workflow

### What Works Now:
1. ✅ User taps "Podcast" in app
2. ✅ App calls `podcast_create` → episode created with status='queued'
3. ✅ **NEW**: Call `podcast_generate_script` → dialogue written, status='voicing'
4. ⏳ **TODO**: Call `podcast_generate_audio` → audio created, status='ready'
5. ✅ App shows transcript (segments)
6. ⏳ App plays audio (coming soon)

### How to Trigger Script Generation

**Option A: Manual (for testing)**
```bash
curl -X POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/podcast_generate_script \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"episode_id\": \"$EPISODE_ID\"}"
```

**Option B: Automated (recommended for production)**
- Set up a Supabase Database Webhook or Edge Function trigger
- When `podcast_episodes.status` changes to 'queued'
- Automatically call `podcast_generate_script`
- Then automatically call `podcast_generate_audio`
- Fully hands-off for users!

## Troubleshooting

### "Service configuration error"
- `GEMINI_API_KEY` not set in Edge Function secrets
- Set it in Supabase Dashboard → Edge Functions → Secrets

### Script too generic
- Lesson doesn't have good source content
- Generate a summary first: `lesson_generate_summary`
- Or record a live session to get transcript

### Segments out of order
- Shouldn't happen (seq increments from 1)
- Check for duplicates: `SELECT seq, COUNT(*) FROM podcast_segments WHERE episode_id=? GROUP BY seq HAVING COUNT(*) > 1`

### Gemini timeout
- Large context (>10k chars) can be slow
- Increase timeout in function settings
- Or reduce context size

## Success Metrics

For an 8-minute podcast:
- ✅ **Segments**: 50-80 (average ~64)
- ✅ **Intro**: 1-2 turns only
- ✅ **Content**: Jump in quickly
- ✅ **Turn length**: 1-3 sentences
- ✅ **Examples**: 1-2 per major concept
- ✅ **Outro**: 1-2 turns with encouraging close
- ✅ **Generation time**: < 20 seconds

## Summary

The script generation system is **fully deployed and working**. You can now:

1. ✅ Create podcast episodes (`podcast_create`)
2. ✅ Generate dialogue scripts (`podcast_generate_script`)
3. ⏳ Generate audio (Phase 3 - coming next)
4. ⏳ Play in app (Phase 4 - coming next)

**Ready to test!** Use the curl commands above or integrate into a workflow. 🎙️
