# Podcast Script Generation - Prompt Improvement

## Overview

Updated the podcast script generation prompt to produce more natural, engaging, and human-sounding podcast dialogues. The new prompt emphasizes conversational flow, distinct host personalities, and structured educational content.

## Changes Made

### File Modified
`/study-os-mobile/supabase/functions/podcast_generate_script/index.ts`

### 1. Temperature Adjustment
**Before**: `temperature: 1.0`
**After**: `temperature: 0.8`

**Reason**: Lower temperature (0.7-0.85 range) produces more controlled, natural output while avoiding weird and repetitive responses that can occur at temperature 1.0.

### 2. Improved Prompt Structure

#### Key Improvements

**Host Personality Definition**
- **Speaker A**: Structured teacher, keeps the thread, drives the outline
- **Speaker B**: Relatable explainer, gives analogies, real-world examples, checks understanding, occasionally jokes lightly

This creates distinct voices and natural back-and-forth.

**Hard Constraints for Natural Audio**
- Each line: 6-22 words (short, spoken)
- Use contractions (we're, it's, don't)
- Max 2 consecutive turns per speaker
- No corporate/robotic tone
- No "As an AI" references

**Structured Episode Format**
1. **Cold open hook** (15-25 sec): Surprising fact, question, or relatable scenario
2. **Why it matters** (20-40 sec): Relevance and importance
3. **Main explanation** (3-5 sections):
   - Crisp explanation
   - Concrete example or analogy
   - Checkpoint question with answer
4. **Final recap** (30-45 sec): 3 bullet takeaways
5. **Outro**: Encouraging, back-to-action style

**Quality Checks Built Into Prompt**
- Does it sound like humans talking?
- Does every section have at least one example?
- Are there checkpoints every 90-120 seconds?
- Are lines short and speakable?

### 3. Style Mode Refinement

**Before** (verbose descriptions):
```typescript
direct_review: "Keep it direct and focused. Get to the point quickly with clear explanations and 1-2 concrete examples per concept. No long-winded introductions."
```

**After** (concise directives):
```typescript
direct_review: "faster pace, minimal fluff, more checkpoints"
friendly: "warmer, light humor, more analogies"
exam: "highlight definitions, common traps, and mini-questions"
```

## Expected Improvements

### Before (Old Prompt Issues)
- ❌ Generic "Welcome to the podcast" intros
- ❌ Long monologues that don't sound natural
- ❌ Textbook-like explanations
- ❌ Inconsistent pacing
- ❌ No clear structure for examples/checkpoints
- ❌ Corporate/robotic tone

### After (New Prompt Benefits)
- ✅ **Cold opens** with hooks that grab attention immediately
- ✅ **Short, punchy lines** (6-22 words) optimized for listening
- ✅ **Distinct host personalities** creating natural dialogue
- ✅ **Structured checkpoints** for knowledge verification
- ✅ **Concrete examples** in every section
- ✅ **Natural language** with contractions and conversational flow
- ✅ **Consistent pacing** with time-based structure
- ✅ **Action-oriented outros** ("Let's jump back in!")

## Example Output Structure

### Old Style (Robotic)
```
A: "Welcome to this podcast episode about neural networks."
B: "Thank you. Today we will learn about neural networks and their applications."
A: "Neural networks are computational models inspired by biological neural networks."
```

### New Style (Natural)
```
A: "Your phone knows your face better than your friends do. How?"
B: "Neural networks! And they're way simpler than you think."
A: "Let's break it down. Think of it like this—each neuron's just making a yes-or-no call."
B: "Exactly. Like a really smart light switch. Millions of them."
A: "Quick check—what's the neuron deciding?"
B: "Whether to fire or not. Based on what it's getting from neighbors."
```

## JSON Output Schema

```json
{
  "title": "How Your Phone Recognizes Your Face",
  "segments": [
    {
      "speaker": "a",
      "text": "Your phone knows your face better than your friends do. How?"
    },
    {
      "speaker": "b",
      "text": "Neural networks! And they're way simpler than you think."
    },
    ...
  ]
}
```

## Configuration Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `model` | `gemini-2.0-flash-exp` | Latest Gemini with JSON mode |
| `temperature` | `0.8` | Balanced creativity and consistency |
| `maxOutputTokens` | `8192` | Full episode generation |
| `responseMimeType` | `application/json` | Structured output |

## Testing Recommendations

### Test Cases
1. **Technical lesson** (e.g., "Neural Networks") - Check for clear analogies
2. **Historical lesson** (e.g., "World War II") - Check for engaging narrative
3. **Math lesson** (e.g., "Calculus Basics") - Check for concrete examples
4. **Language lesson** (e.g., "Spanish Grammar") - Check for practice checkpoints

### Quality Metrics
- [ ] Average line length: 8-18 words
- [ ] Checkpoint frequency: Every 90-120 seconds
- [ ] Example count: At least 1 per major concept
- [ ] Contraction usage: >30% of eligible cases
- [ ] Speaker alternation: No more than 2 consecutive turns

### User Feedback to Collect
- Does it sound natural when played back?
- Are the examples helpful and relatable?
- Is the pacing comfortable for learning?
- Do the hosts sound distinct?
- Are checkpoints useful for retention?

## Deployment

No additional deployment steps needed. The changes are in the Edge Function code and will be applied on the next function invocation.

**To deploy**:
```bash
cd study-os-mobile
supabase functions deploy podcast_generate_script
```

## Rollback Plan

If issues arise, revert to the previous prompt by restoring from git:
```bash
git diff HEAD~1 supabase/functions/podcast_generate_script/index.ts
git checkout HEAD~1 -- supabase/functions/podcast_generate_script/index.ts
supabase functions deploy podcast_generate_script
```

## Related Files

- `/study-os-mobile/supabase/functions/podcast_generate_script/index.ts` - Main script generator
- `/study-os-mobile/supabase/functions/podcast_generate_audio/index.ts` - Audio generation (TTS)
- `/study-os-mobile/apps/mobile/src/data/podcasts.repository.ts` - Client-side podcast queries
- `/study-os-mobile/apps/mobile/src/screens/Podcasts/PodcastPlayerScreen.tsx` - Playback UI

## Future Enhancements

1. **Voice Variation**: Map Speaker A/B to different TTS voices for even clearer distinction
2. **Background Music**: Add subtle music cues between sections
3. **Sound Effects**: Add light sound effects for transitions
4. **Pacing Control**: Allow users to select "quick" (5 min) vs "deep" (15 min) versions
5. **Personalization**: Learn from user feedback (likes/dislikes) to adjust style
6. **Multi-language**: Generate scripts in different languages
7. **Guest Expert Mode**: Add a third voice for complex topics
8. **Interactive Questions**: Pause for user to answer before revealing checkpoint answer

## Credits

Prompt design inspired by best practices from:
- Educational podcast production (Radiolab, 99% Invisible style)
- Conversational AI research (natural dialogue patterns)
- Audio learning optimization (retention through checkpoints)
