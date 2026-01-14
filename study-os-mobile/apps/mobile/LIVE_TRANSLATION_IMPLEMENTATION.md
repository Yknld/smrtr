# Live Caption Translation System

Complete implementation of context-aware live translation for captions using Gemini AI.

## Overview

The live translation system provides real-time translation of English transcriptions to 23 supported languages. Translation happens automatically every 3 seconds, only for complete sentences, with context awareness for better accuracy.

## Key Features

### 1. Global Language Setting
- Set once in Settings → Study Preferences → Content Language
- Persists across app sessions using AsyncStorage
- Applies to all generated content (notes, flashcards, quizzes, live captions)
- Easy to change at any time

### 2. Context-Aware Translation
- Uses Gemini AI for high-quality translations
- Maintains conversation context (last 3-10 sentences)
- Understands topic and domain for better accuracy
- Natural, flowing translations that maintain meaning

### 3. Smart Sentence Detection
- Only translates complete sentences (ending with . ! ? etc.)
- Buffers incomplete sentences for next batch
- Prevents partial/broken translations
- Smooth, natural output

### 4. 3-Second Translation Interval
- Automatic translation every 3 seconds during recording
- Efficient batching of sentences
- Non-blocking UI updates
- Visual indicators when translating

### 5. Dual Display
- English transcript shown at top
- Translated text shown below with visual separation
- Clear language labels
- Different text colors for distinction

## Architecture

### Components Created

#### 1. **PreferencesStore** (`state/preferences.store.ts`)
- Singleton store for user preferences
- AsyncStorage persistence
- Type-safe preference management
- Real-time subscription support
- Caching for performance

**Key Methods:**
```typescript
- load(): Promise<UserPreferences>
- save(preferences: Partial<UserPreferences>): Promise<void>
- get<K>(key: K): Promise<UserPreferences[K]>
- set<K>(key: K, value: UserPreferences[K]): Promise<void>
- getCached(): UserPreferences
- subscribe(listener: Function): UnsubscribeFn
```

#### 2. **GeminiTranslationService** (`services/geminiTranslation.ts`)
- Context-aware translation using Gemini API
- Sentence detection and extraction
- Batch translation support
- Fallback error handling

**Key Methods:**
```typescript
- hasCompleteSentences(text: string): boolean
- extractCompleteSentences(text: string): { complete, remaining }
- translate(text, targetLang, context): Promise<TranslationResult>
- translateBatch(sentences, targetLang, context): Promise<string[]>
```

#### 3. **LiveTranscriptionScreen** (Updated)
- Integrated translation logic
- Sentence buffering
- 3-second translation timer
- Dual language display
- Translation state indicators

## Translation Flow

```
1. User starts recording
   ↓
2. English transcript comes from AssemblyAI
   - Displayed immediately in English section
   ↓
3. Final transcript added to sentence buffer
   ↓
4. Every 3 seconds: Translation Timer fires
   ↓
5. Extract complete sentences from buffer
   ↓
6. Send to Gemini with context (last 3 sentences)
   ↓
7. Display translation in translated section
   ↓
8. Keep incomplete sentences for next cycle
   ↓
9. Update context history
   ↓
10. Repeat until recording stops
```

## User Experience

### Setup Flow
1. Open Settings
2. Navigate to Study Preferences
3. Select Content Language from 23 options
4. Language preference is saved automatically
5. All future content uses this language

### Live Caption Flow
1. Start live transcription
2. English appears in real-time (top section)
3. Every 3 seconds, complete sentences are translated
4. Translation appears below in selected language
5. Visual indicators show translation in progress
6. Both English and translation are saved

### Visual Layout
```
┌─────────────────────────────┐
│  ENGLISH                    │
│  This is the live           │
│  transcription in English.  │
│  New text appears here...   │
├─────────────────────────────┤
│  SPANISH                    │
│  Esta es la transcripción   │
│  en vivo en inglés...       │
│  Translating...             │
└─────────────────────────────┘
```

## Technical Implementation Details

### Sentence Detection
Uses regex patterns to detect sentence endings:
- Period (.), exclamation mark (!), question mark (?)
- Support for non-Latin scripts (。！？)
- Trailing whitespace handling

### Translation Context
Maintains context for better translations:
- **Previous sentences**: Last 3-10 sentences for conversation flow
- **Topic**: Inferred as "Live lecture or conversation"
- **Domain**: Can be specialized (academic, casual, technical)

### Buffer Management
```typescript
// State refs for efficient updates
sentenceBufferRef: Current buffer of untranslated text
incompleteSentenceRef: Partial sentence waiting for completion
contextSentencesRef: History of translated sentences
lastTranslationRef: Last successful translation
```

### Timer Logic
```typescript
// Translation interval
const TRANSLATION_INTERVAL = 3000; // 3 seconds

// Timer setup
setInterval(() => {
  translateBuffer(); // Only translates complete sentences
}, TRANSLATION_INTERVAL);
```

### Error Handling
- Graceful fallback to original text on error
- Non-blocking translation (UI stays responsive)
- Error logging for debugging
- Retry logic for transient failures

## API Integration

### Gemini Edge Function (Recommended)
```typescript
POST https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/gemini_translate

Headers:
  Authorization: Bearer {session_token}
  Content-Type: application/json

Body:
  {
    "text": "Hello world.",
    "targetLanguage": "Spanish",
    "context": {
      "previousSentences": ["..."],
      "topic": "Live lecture",
      "domain": "Academic"
    }
  }

Response:
  {
    "translation": "Hola mundo.",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }
```

### Direct Gemini API (Fallback)
```typescript
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent

Query params:
  key: {GEMINI_API_KEY}

Body:
  {
    "contents": [{
      "parts": [{
        "text": "Translate to Spanish: Hello world."
      }]
    }],
    "generationConfig": {
      "temperature": 0.3,
      "maxOutputTokens": 1000
    }
  }
```

## Performance Considerations

### Optimization Strategies
1. **Batching**: Translate multiple sentences together
2. **Caching**: Store recent translations
3. **Debouncing**: 3-second interval prevents excessive API calls
4. **Async/Non-blocking**: UI remains responsive during translation
5. **Context Window**: Limit context to last 10 sentences

### Resource Usage
- **Network**: ~1 API call every 3 seconds (when recording)
- **Storage**: AsyncStorage for preferences (~1KB)
- **Memory**: Minimal - uses refs for buffers
- **CPU**: Low - sentence detection is lightweight

## Configuration

### Environment Variables
```env
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

### Adjustable Parameters
```typescript
// In geminiTranslation.ts
const CONTEXT_SENTENCES_MAX = 10; // Max context history
const CONTEXT_SENTENCES_FOR_TRANSLATION = 3; // Sentences per request

// In LiveTranscriptionScreen.tsx
const TRANSLATION_INTERVAL = 3000; // Translation frequency (ms)
```

## Files Modified/Created

### Created:
- `apps/mobile/src/state/preferences.store.ts` - Global preferences management
- `apps/mobile/src/services/geminiTranslation.ts` - Translation service
- `apps/mobile/LIVE_TRANSLATION_IMPLEMENTATION.md` - This documentation

### Modified:
- `apps/mobile/src/screens/Settings/StudyPreferencesScreen.tsx` - Save language preference
- `apps/mobile/src/screens/LiveTranscription/LiveTranscriptionScreen.tsx` - Translation logic
- `apps/mobile/src/components/LanguageSelector/LanguageSelector.tsx` - Reused for consistency

## Dependencies

### Required Packages
```json
{
  "@react-native-async-storage/async-storage": "^1.x.x"
}
```

### Installation
```bash
npm install @react-native-async-storage/async-storage
# or
yarn add @react-native-async-storage/async-storage
# or
expo install @react-native-async-storage/async-storage
```

## Testing Checklist

- [ ] Language preference saves and persists
- [ ] Live transcription shows English immediately
- [ ] Translation appears after 3 seconds
- [ ] Only complete sentences are translated
- [ ] Incomplete sentences wait for completion
- [ ] Context improves translation quality
- [ ] Both texts are scrollable
- [ ] Translation indicator appears during processing
- [ ] Language label shows correct language name
- [ ] Stopping recording translates remaining buffer
- [ ] Works with all 23 supported languages
- [ ] No blocking/freezing during translation
- [ ] Error handling works (no crashes)
- [ ] Transcript persists to database

## Future Enhancements

1. **Manual Translation Trigger**
   - Button to translate on demand
   - Don't wait for 3-second timer

2. **Translation History**
   - Save translated versions of transcripts
   - Allow switching between languages post-recording

3. **Offline Mode**
   - Cache common translations
   - Queue translations when offline

4. **Voice Output**
   - Text-to-speech for translated text
   - Listen to translation while recording

5. **Custom Translation Models**
   - Support for specialized vocabularies
   - Domain-specific translation models

6. **Translation Editing**
   - Allow manual correction of translations
   - Learn from user corrections

7. **Multi-Language Support**
   - Translate to multiple languages simultaneously
   - Side-by-side comparison view

## Troubleshooting

### Translation Not Appearing
- Check language preference in Settings → Study Preferences
- Ensure language is not set to English
- Verify network connection
- Check console for API errors

### Incomplete Translations
- Wait for sentences to complete (ending with . ! ?)
- Translation only happens every 3 seconds
- Check if sentence buffer is being filled

### Poor Translation Quality
- Verify context is being passed
- Check if topic/domain could be more specific
- Consider adjusting Gemini temperature parameter

### Performance Issues
- Reduce translation frequency (increase interval)
- Limit context sentences (decrease history)
- Check network latency

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify Gemini API key is configured
- Ensure Supabase edge function is deployed
- Test with English language first to isolate issues
