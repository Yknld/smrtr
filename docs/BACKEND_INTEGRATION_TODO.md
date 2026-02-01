# Study OS Web – Backend Integration Todo

Connect each web screen to Supabase (and Edge Functions) by replicating the **study-os-mobile** app pattern: **repositories** in `data/` call Supabase; **screens** import repositories and call them in `useEffect` / handlers. Replace `src/study-os/data/mock.js` with real API calls.

**Reference:** `study-os-mobile/apps/mobile/src/`  
- **Config:** `config/supabase.ts` – `createClient(SUPABASE_URL, ANON_KEY)`  
- **Data:** `data/courses.repository.ts`, `lessons.repository.ts`, `lessonOutputs.repository.ts`, `podcasts.repository.ts`, etc.  
- **Screens:** Import from `../../data/*.repository` and call `fetch*` / `create*` in load handlers.

---

## 0. Shared setup (do first)

- [ ] **0.1** Add Supabase client for web  
  - Create `src/study-os/config/supabase.js` (or `.ts` if you add TypeScript).  
  - Use `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` with `auth: { persistSession: true, storage: window.localStorage }` (or a custom storage adapter).  
  - Copy `SUPABASE_URL` and anon key from `study-os-mobile/apps/mobile/src/config/supabase.ts`.  
- [ ] **0.2** Add auth (optional but required for most screens)  
  - If the app has login: add a minimal auth flow (e.g. sign in with Supabase Auth) and gate screens that require `user`.  
  - In repositories, use `await supabase.auth.getUser()` and throw if no user (same as mobile).

---

## 1. HomeScreen

**Mobile:** `HomeScreen.tsx` → `fetchCourses()`, `searchCourses()`, `createCourse()` from `data/courses.repository.ts`.

- [ ] **1.1** Add `src/study-os/data/courses.repository.js`  
  - Implement `fetchCourses()`: `supabase.from('courses').select(\`..., lessons (...)\`).eq('user_id', user.id).order('created_at', { ascending: false })`.  
  - Transform rows to match current web shape (e.g. `lessonCount`, `lastOpenedAt`, `isCompleted`).  
  - Implement `createCourse(input)`, `searchCourses(courses, query)` (client-side filter) if needed.  
- [ ] **1.2** HomeScreen: replace `getCourses()` from mock with `fetchCourses()` from courses.repository; handle loading and errors.  
- [ ] **1.3** Create course: replace mock `createCourse()` with repository `createCourse()`; after create, refresh list and navigate to new course or lesson as in mobile.

---

## 2. CourseDetailScreen

**Mobile:** `CourseDetailScreen.tsx` → `fetchLessons(courseId)` from `data/lessons.repository.ts`; `createLesson()`.

- [ ] **2.1** Add `src/study-os/data/lessons.repository.js`  
  - Implement `fetchLessons(courseId)`: `supabase.from('lessons').select(\`..., lesson_outputs (...), lesson_assets (...)\`).eq('course_id', courseId).eq('user_id', user.id)`.  
  - Map to `hasSummary`, `hasFlashcards`, `hasQuiz`, `hasPodcast`, `hasVideo` from outputs/assets (see mobile `lessons.repository.ts`).  
  - Implement `createLesson(courseId, title, sourceType)`, `updateLessonTitle(lessonId, title)` if used.  
- [ ] **2.2** CourseDetailScreen: replace `getLessons()` / `createLesson()` from mock with lessons.repository; show loading and empty state.

---

## 3. LessonHubScreen

**Mobile:** `LessonHubScreen.tsx` uses `updateLessonTitle`, YouTube repo, schedule repo, podcast preload; lesson “notes” and outputs come from lesson data / notes service.

- [ ] **3.1** Lesson notes (main doc)  
  - **Option A:** Add a notes API (e.g. `lesson_outputs` where `type === 'notes'` and a column like `notes_final_text` / `notes_raw_text`, as in mobile AssetsScreen).  
  - **Option B:** Reuse or port `services/notes.ts` (get/commit/finalize) and call it from LessonHubScreen.  
  - Replace localStorage-only note body with: load note for `lessonId` on mount; save on blur or debounced input.  
- [ ] **3.2** Lesson outputs (badges: Generated / Generate)  
  - For each action (flashcards, quiz, podcast, video, interactive), derive “has output” from lesson data (e.g. from `fetchLessonById(lessonId)` or from course/lesson fetch that includes `lesson_outputs` and `lesson_assets`).  
  - Use `fetchLessonById(lessonId)` from lessons.repository (add it if missing) so LessonHub knows what’s ready.  
- [ ] **3.3** Assets section on LessonHub  
  - Replace mock `MOCK_ASSETS` with a small fetch: e.g. `lesson_assets` for this `lessonId` (or reuse the same API as AssetsScreen).  
- [ ] **3.4** (Optional) Header actions: play, calendar, edit – wire to `updateLessonTitle` and any schedule/YouTube APIs if you add those features on web.

---

## 4. FlashcardsScreen

**Mobile:** `FlashcardsScreen.tsx` → `fetchFlashcards(lessonId)`, `generateFlashcardsAndQuiz()` from `data/lessonOutputs.repository.ts`.

- [ ] **4.1** Add `src/study-os/data/lessonOutputs.repository.js`  
  - Implement `fetchLessonOutput(lessonId, type)` → `supabase.from('lesson_outputs').select('*').eq('lesson_id', lessonId).eq('user_id', user.id).eq('type', type).maybeSingle()`.  
  - Implement `fetchFlashcards(lessonId)` → fetch output type `'flashcards'`; return `contentJson.cards` (array of `{ front, back }`).  
  - Implement `generateFlashcards(lessonId)` (or `generateFlashcardsAndQuiz`) by calling Edge Function `lesson_generate_flashcards` (POST with `lesson_id`, auth header).  
- [x] **4.2** FlashcardsScreen: replace `getFlashcards(lessonId)` from mock with `fetchFlashcards(lessonId)`; map API response to existing card shape; add “Generate” flow that calls `generateFlashcards` then refetches.

---

## 5. QuizScreen

**Mobile:** `QuizScreen.tsx` → `fetchQuiz(lessonId)`, `generateFlashcardsAndQuiz()` or `generateQuiz()` from `data/lessonOutputs.repository.ts`.

- [x] **5.1** In lessonOutputs.repository: implement `fetchQuiz(lessonId)` → fetch output type `'quiz'`; return `contentJson.questions` (shape: `q`, `choices`, `answer_index` / `correctAnswer`, `explanation`).  
- [ ] **5.2** Implement `generateQuiz(lessonId)` → call Edge Function `lesson_generate_quiz` (POST with `lesson_id`, auth).  
- [x] **5.3** QuizScreen: replace `getQuizQuestions(lessonId)` from mock with `fetchQuiz(lessonId)`; map API questions to your component’s format; add “Generate quiz” when empty; after submit optionally record score (if you add a progress table later).

---

## 6. PodcastsScreen & CoursePodcastsScreen

**Mobile:** `PodcastsScreen.tsx` / `CoursePodcastsScreen.tsx` → `podcasts.repository.ts`: list courses with podcast counts; list episodes per course/lesson; signed URLs for audio.

- [ ] **6.1** Add `src/study-os/data/podcasts.repository.js`  
  - Implement “courses with podcasts” query (e.g. from `courses` + `lessons` + `lesson_assets` where kind = audio, or from `podcast_episodes` if you use that).  
  - Implement “podcasts for course” and “podcast for lesson” (episode + segments, signed URLs).  
  - Mirror mobile: `fetchCoursesWithPodcasts()`, `fetchPodcastsForCourse(courseId)`, `fetchPodcastForLesson(lessonId)` / get episode + segments.  
- [ ] **6.2** PodcastsScreen: replace `getCoursesWithPodcasts()` from mock with podcasts.repository.  
- [ ] **6.3** CoursePodcastsScreen: replace `getPodcastsForCourse(courseId)` with podcasts.repository; use real lesson titles and durations.

---

## 7. PodcastPlayerScreen

**Mobile:** `PodcastPlayerScreen.tsx` → `fetchPodcastEpisode()`, `fetchPodcastSegments()`, signed URLs; playback with Expo AV.

- [ ] **7.1** In podcasts.repository (or a small player helper): get episode + segments for `lessonId`; get signed URLs for each segment audio.  
- [ ] **7.2** PodcastPlayerScreen: replace mock/simulated progress with real audio: use a single `<audio>` or concatenated segments; wire play/pause and seek to actual duration; display real duration and current time from segment data.

---

## 8. VideoPlayerScreen

**Mobile:** `VideoPlayerScreen.tsx` receives `videoUrl` in params (signed URL); plays with Expo AV.

- [ ] **8.1** Source of video URL: either from LessonHub (e.g. from `lesson_assets` where `kind === 'video'` and a signed URL) or from a “generate video” Edge Function.  
- [ ] **8.2** When navigating to VideoPlayer, pass `videoUrl` in location state (or resolve by `lessonId` in the screen).  
- [ ] **8.3** VideoPlayerScreen: when `videoUrl` is present, use it in `<video src={videoUrl} />`; keep current placeholder when no URL.

---

## 9. AssetsScreen

**Mobile:** `AssetsScreen.tsx` → `supabase.from('lesson_assets').select('*').eq('lesson_id', lessonId)`; also `lesson_outputs` type `'notes'` for exported notes.

- [ ] **9.1** Add `src/study-os/data/assets.repository.js` (or extend lessons.repository):  
  - Fetch `lesson_assets` for `lessonId` (and optionally `lesson_outputs` for notes).  
  - Map to list of { id, kind, filename, storage_path, duration_ms, created_at }; get signed URLs for display/download.  
- [ ] **9.2** AssetsScreen: replace mock assets with this fetch; group by kind if desired; open/download via signed URL.

---

## 10. InteractiveSolverScreen

**Mobile:** `InteractiveSolverScreen.tsx` → get session token; load `SOLVER_VIEWER_URL?lesson_id=...`; inject `__SUPABASE_TOKEN__`, `__SUPABASE_URL__`, `__LESSON_ID__`; render in WebView (or fetch HTML and inject, then show in iframe).

- [ ] **10.1** Web: get session with `supabase.auth.getSession()`; build viewer URL (e.g. `SOLVER_VIEWER_URL + '?lesson_id=' + lessonId`).  
- [ ] **10.2** If you use an iframe: set `src` to that URL and pass token via postMessage or query (if the viewer supports it).  
  - Or fetch the viewer HTML, inject a script that sets `window.__SUPABASE_TOKEN__` and `window.__LESSON_ID__`, then render HTML in a sandboxed iframe (e.g. srcdoc).  
- [ ] **10.3** InteractiveSolverScreen: replace “no content” placeholder with: when token exists, load viewer URL (or injected HTML) into iframe; show loading until load; on auth error, show “Sign in required”.

---

## 11. AITutorScreen

**Mobile:** `AITutorScreen.tsx` → `supabase.auth.getSession()`; `supabase.functions.invoke('tutor_chat', { body: { conversationId, lessonId, message, ... } })`.

- [ ] **11.1** Implement `tutorChat({ conversationId, lessonId, message, sourceCount })` (or inline in screen):  
  - `await supabase.functions.invoke('tutor_chat', { body: { conversation_id: conversationId, lesson_id: lessonId, message, source_count: sourceCount } })`.  
- [ ] **11.2** AITutorScreen: replace mock “Thinking…” reply with call to `tutor_chat`; append assistant message from response; handle errors and loading.

---

## 12. LiveScreen (Live transcription)

**Mobile:** `LiveTranscriptionScreen.tsx` → Assembly AI or Gemini live service; NotesService for commit/get notes.

- [x] **12.1** Backend: same as mobile – Edge Function transcribe_start + AssemblyAI WebSocket; client streams PCM 16kHz. same as mobile (e.g. Assembly Live or Gemini Live) or a simpler “upload audio and get transcript” API.  
- [x] **12.2** Added services/assemblyLive.js + data/liveTranscription.repository.js; LiveScreen displays LIVE TRANSCRIPT. “live” API: add a small service (e.g. `src/study-os/services/liveTranscription.js`) that starts/stops recording and sends audio to the API; receive transcript and push to LIVE TRANSCRIPT card.  
- [x] **12.3** Notes: study_sessions, live_transcript_segments, notes_commit_from_segments, notes_get, notes_finalize- [ ] **12.4** “Ask this lesson” bar: can reuse same `tutor_chat` as AITutor with a “context: lesson” flag, or a dedicated Edge Function.

---

## 13. Settings & profile (optional)

**Mobile:** `SettingsScreen.tsx`, `ProfileScreen.tsx` → Supabase auth and possibly a `profiles` table.

- [ ] **13.1** Profile: load user from `supabase.auth.getUser()`; if you have `profiles`, fetch by `user.id`.  
- [ ] **13.2** Sign out: `supabase.auth.signOut()`.  
- [ ] **13.3** Other settings (notifications, study preferences, language): persist via Supabase or localStorage until you define schema.

---

## Order of implementation (suggested)

1. **0** – Supabase config + auth (if needed).  
2. **1, 2** – Home + CourseDetail (courses and lessons list/create).  
3. **4, 5** – Flashcards + Quiz (lesson_outputs + Edge Functions).  
4. **3** – LessonHub (notes + outputs + assets).  
5. **6, 7, 8** – Podcasts list + player + video.  
6. **9** – Assets.  
7. **10** – Interactive solver.  
8. **11** – AI Tutor.  
9. **12** – Live (once backend is decided).  
10. **13** – Settings/Profile as needed.

---

## Files to add or change (web)

| Item | Action |
|------|--------|
| `src/study-os/config/supabase.js` | Add (client + env for URL/key). |
| `src/study-os/data/courses.repository.js` | Add (replace mock getCourses/createCourse). |
| `src/study-os/data/lessons.repository.js` | Add (replace mock getLessons/createLesson). |
| `src/study-os/data/lessonOutputs.repository.js` | Add (flashcards, quiz, fetch + generate). |
| `src/study-os/data/podcasts.repository.js` | Add (list + episode/segments + signed URLs). |
| `src/study-os/data/assets.repository.js` | Add (or part of lessons) for lesson_assets. |
| `src/study-os/data/mock.js` | Gradually remove or keep as fallback when no auth. |
| Each screen in `src/study-os/screens/*.jsx` | Swap mock calls for repository/API calls; add loading and error handling. |

Use the mobile app’s **repositories and screen logic** as the single source of truth; replicate table names, select shapes, and Edge Function names so the web app stays in sync with the backend.
