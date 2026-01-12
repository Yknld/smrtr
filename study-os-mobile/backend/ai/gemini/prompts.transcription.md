# Gemini Transcription Prompts and Algorithms

This document specifies the prompts used for Gemini audio transcription and the merge/deduplication algorithms for overlapping chunks.

---

## Overview

The transcription system uses two types of prompts:

1. **Chunk Transcription Prompt** - Transcribe individual 3-second chunks with overlap
2. **Window Re-decode Prompt** - (Optional) Refine larger 10-15 second windows periodically

After transcription, chunks are merged using a **suffix-prefix matching algorithm** with overlap deduplication.

---

## 1. Chunk Transcription Prompt

### Purpose

Transcribe a single audio chunk (typically 3 seconds) with minimal processing, preserving the speaker's exact wording for later merging.

### Prompt Template

```
Transcribe the following audio exactly as spoken. Follow these rules:

1. OUTPUT ONLY THE TRANSCRIPT TEXT
   - No commentary, explanations, or metadata
   - No timestamps or speaker labels
   - No sentence like "Here is the transcript:" or "The speaker says:"
   - Start immediately with the transcribed words

2. MINIMAL PUNCTUATION
   - Add only essential punctuation (periods, commas, question marks)
   - Avoid excessive punctuation that might interfere with text matching
   - Use commas to separate phrases, periods to end sentences
   - Add question marks only for clear questions

3. PRESERVE EXACT WORDING
   - Transcribe exactly what is said, including:
     - Filler words (um, uh, like, you know)
     - False starts and corrections
     - Repeated words
     - Informal language and contractions
   - Do NOT:
     - Clean up or formalize the language
     - Remove stutters or hesitations
     - Correct grammatical errors
     - Add words not spoken

4. HANDLE UNCLEAR AUDIO
   - Use [inaudible] for words you cannot understand
   - Use [inaudible] for background noise that obscures speech
   - Use [crosstalk] if multiple people speak simultaneously
   - Continue transcribing after unclear sections

5. MAINTAIN NATURAL FLOW
   - Preserve the speaker's natural speech patterns
   - Keep conversational tone intact
   - Include natural pauses (via punctuation)

{language_hint}

Transcribe the audio now:
```

### Language Hint (Optional)

If the session has a specified language, include this hint:

```
6. LANGUAGE
   - The audio is in {language_code} (e.g., English, Spanish, French)
   - Use appropriate grammar and spelling for this language
   - Preserve idioms and expressions in the original language
```

**Example language hints:**
- `The audio is in English (en-US). Use American English spelling.`
- `The audio is in Spanish (es-ES). Use European Spanish conventions.`
- `The audio is in French (fr-FR). Include French accents and diacritics.`

### Example Inputs and Expected Outputs

#### Example 1: Clean Speech

**Audio**: "Hello, how are you doing today? It's a beautiful morning outside."

**Expected Output**:
```
Hello, how are you doing today? It's a beautiful morning outside.
```

**NOT**:
```
Here is the transcript: "Hello, how are you doing today? It's a beautiful morning outside."
```

---

#### Example 2: With Filler Words

**Audio**: "So, um, the mitochondria is, you know, the powerhouse of the cell."

**Expected Output**:
```
So, um, the mitochondria is, you know, the powerhouse of the cell.
```

**NOT** (cleaned up):
```
The mitochondria is the powerhouse of the cell.
```

---

#### Example 3: With False Starts

**Audio**: "The process of photo—uh, photosynthesis converts light energy."

**Expected Output**:
```
The process of photo, uh, photosynthesis converts light energy.
```

**NOT**:
```
The process of photosynthesis converts light energy.
```

---

#### Example 4: With Unclear Audio

**Audio**: "Cellular respiration involves [noise] glycolysis and [unclear mumbling]."

**Expected Output**:
```
Cellular respiration involves [inaudible] glycolysis and [inaudible].
```

---

#### Example 5: Multiple Sentences

**Audio**: "Let's discuss biology. It's really interesting. Especially when studying cells."

**Expected Output**:
```
Let's discuss biology. It's really interesting. Especially when studying cells.
```

---

### Why These Rules?

**Output-only (no commentary)**
- Simplifies parsing - no need to extract transcript from surrounding text
- Reduces token usage
- Makes merge/dedupe algorithm reliable

**Minimal punctuation**
- Too much punctuation makes text matching harder
- Commas and periods are sufficient for readability
- Reduces false mismatches during overlap detection

**Preserve exact wording**
- Enables accurate overlap detection (word-for-word matching)
- Maintains authenticity of the recording
- User can clean up text later if desired
- Filler words help identify overlap boundaries

**Handle unclear audio explicitly**
- `[inaudible]` is consistent and parseable
- Avoids guessing which creates false matches
- User knows what was missed

---

## 2. Window Re-decode Prompt (Optional)

### Purpose

Periodically re-transcribe larger windows (10-15 seconds) with more context to refine accuracy. This is **optional** and can improve quality but increases cost.

### When to Use

- Every 5 chunks (15 seconds of audio)
- At end of session (final refinement)
- When confidence scores are low for recent chunks
- Trade-off: Better accuracy vs higher API costs

### Prompt Template

```
Transcribe the following audio with maximum accuracy. You have a larger context window to improve transcription quality.

Follow these rules:

1. OUTPUT ONLY THE TRANSCRIPT TEXT
   - No commentary or metadata
   - Start immediately with the transcribed words

2. IMPROVE ACCURACY WITH CONTEXT
   - Use the full audio context to disambiguate unclear words
   - Correct any obvious transcription errors from smaller chunks
   - Improve punctuation and sentence boundaries
   - Maintain natural speech patterns

3. PRESERVE SPEAKER'S WORDING
   - Still transcribe what was actually said
   - Keep filler words if genuinely spoken
   - Don't over-formalize the language
   - Balance accuracy with authenticity

4. HANDLE UNCLEAR AUDIO
   - Use [inaudible] only when truly unclear
   - With more context, you may understand words that were unclear in smaller chunks
   - Re-evaluate unclear sections

5. CONSISTENT OUTPUT FORMAT
   - Must be compatible with chunk transcriptions
   - Use same punctuation style
   - Use same terminology and spelling

{language_hint}

Previous chunk-level transcript (for reference):
{previous_transcript}

Transcribe the full audio window now (improved version):
```

### Example: Window Re-decode

**Chunk-level transcripts (3 chunks, 9 seconds total):**
```
Chunk 0: "The mighty con drea is the power house of the cell."
Chunk 1: "power house of the cell and it produces [inaudible] energy."
Chunk 2: "[inaudible] energy through a process called cellular respiration."
```

**Window re-decode (all 9 seconds at once):**
```
The mitochondria is the powerhouse of the cell and it produces ATP energy through a process called cellular respiration.
```

**Improvements:**
- "mighty con drea" → "mitochondria" (clearer with context)
- "power house" → "powerhouse" (single word is correct)
- "[inaudible] energy" → "ATP energy" (clearer with context)
- Better sentence structure overall

### Implementation Strategy

1. **Accumulate chunks**
   - Buffer last 5 chunks (15 seconds)
   - Keep original chunk transcripts

2. **Re-transcribe window**
   - Send full 15-second audio to Gemini
   - Use window re-decode prompt
   - Get improved transcript

3. **Compare and merge**
   - Compare window transcript with chunk transcripts
   - Identify improvements and corrections
   - Update affected segments in database
   - Update full transcript

4. **Apply selectively**
   - Only update if confidence improvement is significant
   - Don't update if changes are minor (cost vs benefit)
   - Prioritize fixing `[inaudible]` sections

### Cost Considerations

**Chunk-only approach:**
- Transcribe each 3s chunk once
- 60 seconds audio = 20 chunks = 20 API calls
- Lower cost, faster processing

**With window re-decode:**
- Transcribe each 3s chunk once
- Re-transcribe every 15s window (5 chunks)
- 60 seconds audio = 20 chunks + 4 windows = 24 API calls
- 20% more API calls, better accuracy

**Recommendation**: Enable window re-decode only for premium users or critical recordings.

---

## 3. Merge/Dedupe Algorithm Specification

### Overview

After transcribing each chunk, the backend must merge the new transcript with the existing full transcript, handling the overlap region (typically 800ms or ~2-4 words).

The algorithm finds the longest common suffix-prefix match, trims the duplicate text, and appends the new text.

---

### Algorithm Steps

#### Step 1: Normalize Text for Matching

Before comparing texts, normalize both the existing transcript and new chunk transcript.

**Normalization rules:**

1. **Convert to lowercase**
   - "Hello World" → "hello world"
   - Enables case-insensitive matching

2. **Collapse whitespace**
   - Multiple spaces → single space
   - "hello  world" → "hello world"
   - Trim leading/trailing whitespace

3. **Strip punctuation (for matching only)**
   - Remove: `. , ! ? ; : " ' ( ) [ ]`
   - "hello, world!" → "hello world"
   - Note: Keep punctuation in original text for output

4. **Handle special markers**
   - Keep `[inaudible]` as single token
   - Keep `[crosstalk]` as single token
   - Treat as regular words during matching

**Example normalization:**
```
Original: "Hello, how are you? It's great!"
Normalized (for matching): "hello how are you its great"
```

**Why normalize?**
- Punctuation varies between chunks (Gemini may add/remove)
- Case differences shouldn't prevent matching
- Whitespace inconsistencies are common
- Focusing on word content improves match reliability

---

#### Step 2: Extract Overlap Candidates

From the normalized texts, extract potential overlap regions.

**From existing transcript (suffix):**
- Extract last N words (default: last 5-10 words)
- This represents approximately 800ms-2000ms of speech
- Example: Full transcript ends with "beautiful morning outside lets talk"

**From new chunk transcript (prefix):**
- Extract first N words (default: first 5-10 words)
- This represents the beginning of the new chunk
- Example: Chunk starts with "outside lets talk about biology"

**Overlap candidates:**
```
Existing suffix: "beautiful morning outside lets talk"
New prefix:      "outside lets talk about biology"
```

---

#### Step 3: Find Longest Common Substring

Find the longest sequence of consecutive words that appears at the end of the existing transcript AND at the beginning of the new chunk.

**Suffix-Prefix Matching:**
- Compare suffixes of existing text with prefixes of new text
- Start with longest possible match, work down to shortest
- Minimum match length: 2 words (avoid false positives)

**Algorithm pseudocode:**
```
function findOverlap(existingNormalized, newNormalized):
  existingWords = split(existingNormalized, ' ')
  newWords = split(newNormalized, ' ')
  
  maxOverlapLength = min(length(existingWords), length(newWords))
  
  for overlapLength from maxOverlapLength down to 2:
    existingSuffix = last overlapLength words of existingWords
    newPrefix = first overlapLength words of newWords
    
    if existingSuffix == newPrefix:
      return overlapLength  // Found match
  
  return 0  // No overlap found
```

**Example:**
```
Existing words: ["beautiful", "morning", "outside", "lets", "talk"]
New words:      ["outside", "lets", "talk", "about", "biology"]

Try 5-word match: ["morning", "outside", "lets", "talk", "about"] vs 
                  ["outside", "lets", "talk", "about", "biology"] → NO

Try 4-word match: ["outside", "lets", "talk", "about"] vs 
                  ["outside", "lets", "talk", "about"] → NO

Try 3-word match: ["outside", "lets", "talk"] vs 
                  ["outside", "lets", "talk"] → YES ✓

Overlap found: 3 words
```

---

#### Step 4: Trim Overlap from New Chunk

Once overlap is identified, remove the duplicate words from the start of the new chunk transcript.

**Trim operation:**
1. Keep original punctuation and capitalization
2. Split new chunk into words (preserving punctuation)
3. Remove first N words (where N = overlap length)
4. Rejoin remaining words

**Example:**
```
New chunk original: "Outside, let's talk about biology."
Overlap length: 3 words
Words: ["Outside,", "let's", "talk", "about", "biology."]
Trim first 3: ["about", "biology."]
Result: "about biology."
```

**Handle punctuation carefully:**
```
New chunk: "...outside. Let's talk about biology."
Overlap: "outside lets talk"
After trim: "about biology."
(Preserve sentence-starting capitalization in final merge)
```

---

#### Step 5: Append Deduplicated Text

Merge the trimmed new text with the existing full transcript.

**Merge rules:**

1. **Join with single space**
   - Existing: "...beautiful morning outside let's talk"
   - New (trimmed): "about biology"
   - Result: "...beautiful morning outside let's talk about biology"

2. **Preserve sentence boundaries**
   - If new text starts with capital letter, it may start a new sentence
   - Check if existing text ends with `.` or `?`
   - Preserve punctuation naturally

3. **Handle no overlap case**
   - If no overlap found (overlap length = 0), still append
   - Add space between texts
   - Log warning (may indicate audio discontinuity)

**Example merge:**
```
Existing: "Hello, how are you doing today? It's a beautiful morning outside, let's talk"
New (original): "outside, let's talk about cellular biology"
Overlap: "outside lets talk" (3 words)
New (trimmed): "about cellular biology"
Merged: "Hello, how are you doing today? It's a beautiful morning outside, let's talk about cellular biology"
```

---

### Live Caption Revision (Optional Enhancement)

In addition to overlap trimming, the algorithm can **revise the last 1-2 lines** when the new chunk provides better context.

#### Revision Detection

1. **Compare overlap region carefully**
   - Check if new chunk transcription is more accurate
   - Look for word corrections (e.g., "power house" → "powerhouse")
   - Check confidence scores (if available)

2. **Threshold for revision**
   - Only revise if new version is significantly better
   - Calculate edit distance between versions
   - Require 80%+ confidence that new version is correct

3. **Scope of revision**
   - Only revise within overlap region
   - Maximum: Last 1-2 segments (sentences)
   - Never revise older segments (keep history stable)

#### Revision Example

**Scenario:**
```
Existing: "The mitochondria is the power house of the cell."
New chunk (with overlap): "the powerhouse of the cell and it produces ATP"
```

**Analysis:**
- Overlap region: "power house of the cell" vs "powerhouse of the cell"
- Difference detected: "power house" (2 words) vs "powerhouse" (1 word)
- New version more accurate (powerhouse is single word)

**Revision applied:**
```
Before: "The mitochondria is the power house of the cell."
After:  "The mitochondria is the powerhouse of the cell."
New appended: "and it produces ATP"
Final: "The mitochondria is the powerhouse of the cell and it produces ATP."
```

#### When NOT to Revise

- If difference is minor punctuation only
- If confidence in new version is not significantly higher
- If revision would affect segments older than 2 chunks ago
- If edit distance is too large (suggests different content, not correction)

---

### Complete Algorithm Examples

#### Example 1: Standard Overlap

**Existing transcript:**
```
"Hello, how are you doing today? It's a beautiful morning."
```

**New chunk transcript:**
```
"beautiful morning. Let's talk about biology."
```

**Step 1: Normalize**
```
Existing normalized: "hello how are you doing today its a beautiful morning"
New normalized:      "beautiful morning lets talk about biology"
```

**Step 2: Extract candidates**
```
Existing suffix (last 10 words): "how are you doing today its a beautiful morning"
New prefix (first 10 words):     "beautiful morning lets talk about biology"
```

**Step 3: Find overlap**
```
Try 2-word match: ["beautiful", "morning"] vs ["beautiful", "morning"] → YES ✓
Overlap: 2 words
```

**Step 4: Trim new chunk**
```
New chunk words: ["beautiful", "morning.", "Let's", "talk", "about", "biology."]
Remove first 2: ["Let's", "talk", "about", "biology."]
Trimmed: "Let's talk about biology."
```

**Step 5: Append**
```
Existing: "Hello, how are you doing today? It's a beautiful morning."
Trimmed new: "Let's talk about biology."
Merged: "Hello, how are you doing today? It's a beautiful morning. Let's talk about biology."
```

---

#### Example 2: No Overlap Detected

**Existing transcript:**
```
"Cellular respiration occurs in mitochondria."
```

**New chunk transcript:**
```
"Photosynthesis converts light into energy."
```

**Step 1: Normalize**
```
Existing: "cellular respiration occurs in mitochondria"
New:      "photosynthesis converts light into energy"
```

**Step 3: Find overlap**
```
No common words between suffix and prefix
Overlap: 0 words
```

**Step 5: Append anyway (with warning)**
```
Merged: "Cellular respiration occurs in mitochondria. Photosynthesis converts light into energy."
Log: "Warning: No overlap found between chunks. Audio may be discontinuous."
```

---

#### Example 3: Overlap with Revision

**Existing transcript:**
```
"The process of photo syn the sis converts light energy."
```

**New chunk transcript:**
```
"photosynthesis converts light energy into chemical energy."
```

**Step 1: Normalize**
```
Existing: "the process of photo syn the sis converts light energy"
New:      "photosynthesis converts light energy into chemical energy"
```

**Step 3: Find overlap**
```
Matching: "converts light energy" (3 words)
Overlap: 3 words
```

**Step 4: Trim**
```
Trimmed new: "into chemical energy."
```

**Step 5: Revision detection**
```
Overlap region comparison:
  Existing: "photo syn the sis converts light energy"
  New:      "photosynthesis converts light energy"
  
Difference: "photo syn the sis" vs "photosynthesis"
Confidence: New version is correct (single word)
Apply revision: Update existing to "photosynthesis"
```

**Step 6: Final merge with revision**
```
Revised existing: "The process of photosynthesis converts light energy."
Trimmed new: "into chemical energy."
Final: "The process of photosynthesis converts light energy into chemical energy."
```

---

### Edge Cases

#### Case 1: Very Short Chunks

If chunks are very short (<1 second), overlap matching may fail.

**Solution:**
- Require minimum 2-word overlap
- If no match found, append with space
- Log warning for manual review

#### Case 2: Speaker Change

If speaker changes mid-session, overlap may not exist.

**Solution:**
- Detect no-overlap condition
- Insert speaker change marker (optional): `[Speaker change]`
- Append new text with clear separation

#### Case 3: Background Noise

If overlap region contains `[inaudible]`, matching may fail.

**Solution:**
- Treat `[inaudible]` as wildcard during matching
- Allow partial matches with `[inaudible]`
- Example: "hello [inaudible] world" matches "hello beautiful world"

#### Case 4: Excessive Overlap

If overlap is longer than expected (e.g., 5+ seconds), it may indicate duplicate upload.

**Solution:**
- Cap maximum overlap at 50% of chunk duration
- If overlap > 50%, flag as potential duplicate
- Proceed with merge but log warning

---

### Performance Optimization

**For real-time processing:**

1. **Limit comparison window**
   - Only compare last N words (default: 10-15 words)
   - Don't scan entire transcript for every chunk
   - Reduces computational cost

2. **Cache normalized text**
   - Store normalized version of last suffix
   - Avoid re-normalizing entire transcript each time

3. **Early termination**
   - Stop searching once overlap found
   - Don't need to find all possible matches

4. **Parallel processing**
   - Normalize texts in parallel
   - Compare multiple overlap lengths concurrently

---

## Summary

### Chunk Transcription Prompt
- Output transcript text only (no commentary)
- Minimal punctuation for easier matching
- Preserve exact wording (including filler words)
- Use `[inaudible]` for unclear audio
- Optional language hint

### Window Re-decode Prompt (Optional)
- Re-transcribe larger windows (10-15s) for refinement
- Use more context to improve accuracy
- Trade-off: Better quality vs higher cost
- Apply selectively for premium features

### Merge/Dedupe Algorithm
1. **Normalize** both texts (lowercase, strip punctuation, collapse whitespace)
2. **Extract** suffix of existing and prefix of new chunk
3. **Find** longest common substring (minimum 2 words)
4. **Trim** duplicate words from new chunk
5. **Append** deduplicated text to full transcript
6. **Optional**: Apply live caption revisions for last 1-2 lines

### Key Benefits
- Seamless transcript across chunks
- No duplicate text in final output
- Handles overlap gracefully
- Enables live caption-style revisions
- Robust to minor transcription variations

---

## Related Documentation

- [Edge Functions API](../docs/edge-functions-transcription.md) - API behavior specification
- [Transcription Contracts](../../contracts/README.md) - Type definitions
- [Storage Setup](../docs/transcription-storage.md) - Audio storage configuration
