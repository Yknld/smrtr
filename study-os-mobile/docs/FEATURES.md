# Feature Pipelines

One flowchart per feature. Linear steps, one decision where needed.

---

## Lesson Hub (entry and actions)

```mermaid
flowchart TB
    A["Open lesson"] --> B["Load notes + outputs + assets"]
    B --> C["Subscribe realtime lesson_outputs/assets"]
    C --> D["Render tiles: Live, AI Tutor, Interact, Podcast, Video, Flashcards, Quiz, Assets"]
    D --> E["Per tile: outputs.ready or assets?"]
    E --> F["Show Generate | Generating | Generated or Open"]
    F --> G["Tap: navigate to viewer or trigger generation"]
```

---

## Notes

```mermaid
flowchart LR
    A["lesson_outputs type=notes"] --> B["Load notes_final_text or notes_raw_text"]
    B --> C["NotesPreview on hub"]
    C --> D["Tap Read more"]
    D --> E["NotesView screen"]
```

---

## Notes generation (append and finalize)

```mermaid
flowchart TB
    A["Segments or asset text"] --> B["notes_append_from_asset or notes_commit_from_segments"]
    B --> C["Append to lesson_outputs.notes_raw_text"]
    C --> D["notes_finalize when ready"]
    D --> E["Gemini: clean structure"]
    E --> F["Write notes_final_text, status=ready"]
```

---

## Live (record and translate)

```mermaid
flowchart LR
    A["Lesson Workspace"] --> B["Start recording"]
    B --> C["Stream to AssemblyAI or Gemini Live"]
    C --> D["Transcript in UI"]
    D --> E["Optional: gemini_translate"]
    E --> F["Transcript + translation displayed"]
```

---

## AI Tutor

```mermaid
flowchart LR
    A["Open AI Tutor"] --> B["Load context: summary, notes, transcript"]
    B --> C["User sends message"]
    C --> D["tutor_chat Edge Function"]
    D --> E["Gemini: multimodal response"]
    E --> F["Display in chat UI"]
```

---

## Interact (interactive solver)

```mermaid
flowchart TB
    A["Tap Interact"] --> B{"interactive_pages ready?"}
    B -->|No| C["Show modal: photo or generate from lesson"]
    C --> D["interactive_extract_questions_from_image or lesson_generate_interactive"]
    D --> E["RunPod / GeminiLoop"]
    E --> F["Module pushed to Supabase, status=ready"]
    B -->|Yes| G["Navigate to InteractiveSolver"]
    F --> G
    G --> H["WebView: solver.html + auth + lesson_id"]
    H --> I["interactive_module_get returns manifest"]
    I --> J["Render steps with components and audio"]
```

---

## Podcast

```mermaid
flowchart TB
    A["Tap Podcast"] --> B["Navigate to PodcastPlayer"]
    B --> C{"Podcast exists?"}
    C -->|No| D["Generate: outline then script then audio"]
    D --> E["podcast_generate_outline"]
    E --> F["podcast_generate_script"]
    F --> G["podcast_generate_audio (segments, TTS)"]
    G --> H["lesson_assets kind=audio"]
    C -->|Yes| I["Load episode list and audio URLs"]
    H --> I
    I --> J["Play and show transcript"]
```

---

## Video

```mermaid
flowchart LR
    A["Tap Video"] --> B{"Video asset exists?"}
    B -->|No| C["lesson_generate_video Edge Function"]
    C --> D["Story plan, then RunPod/Remotion"]
    D --> E["Upload to storage, lesson_assets kind=video"]
    B -->|Yes| F["Signed URL"]
    E --> F
    F --> G["VideoPlayer screen"]
```

---

## Flashcards

```mermaid
flowchart LR
    A["Tap Flashcards"] --> B{"flashcards ready?"}
    B -->|No| C["lesson_generate_flashcards"]
    C --> D["Gemini + cache by source hash"]
    D --> E["lesson_outputs type=flashcards, content_json"]
    B -->|Yes| F["Navigate to Flashcards screen"]
    E --> F
    F --> G["Render deck from content_json"]
```

---

## Quiz

```mermaid
flowchart LR
    A["Tap Quiz"] --> B{"quiz ready?"}
    B -->|No| C["lesson_generate_quiz"]
    C --> D["Gemini + cache"]
    D --> E["lesson_outputs type=quiz, content_json"]
    B -->|Yes| F["Navigate to Quiz screen"]
    E --> F
    F --> G["Render questions and score"]
```

---

## Assets

```mermaid
flowchart LR
    A["Tap Assets"] --> B["Navigate to Assets screen"]
    B --> C["List lesson_assets for lesson"]
    C --> D["By kind: audio, video, document, etc."]
    D --> E["Open or download via signed URL"]
```

---

## YouTube recommendations

```mermaid
flowchart LR
    A["Hub: play icon"] --> B["Open YouTube sheet"]
    B --> C["Fetch or generate recommendations"]
    C --> D["lesson_youtube_recs or generate_youtube_recommendations"]
    D --> E["Gemini: suggest videos from title/notes"]
    E --> F["Display list; tap opens YouTube"]
```

---

## Schedules

```mermaid
flowchart LR
    A["Hub: calendar icon"] --> B["ScheduleBottomSheet"]
    B --> C["study_plan_upsert"]
    C --> D["RRule + time + duration"]
    D --> E["Study plan stored; reminders"]
```
