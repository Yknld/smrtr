import { supabase } from '../config/supabase';

/**
 * Lesson output types
 */
export type LessonOutputType = 'summary' | 'flashcards' | 'quiz' | 'notes';
export type LessonOutputStatus = 'pending' | 'ready' | 'failed';

/**
 * Base lesson output interface
 */
export interface LessonOutput {
  id: string;
  userId: string;
  lessonId: string;
  type: LessonOutputType;
  status: LessonOutputStatus;
  contentJson: any;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Flashcard structure
 */
export interface Flashcard {
  front: string;
  back: string;
}

/**
 * Flashcard output content
 */
export interface FlashcardOutput extends LessonOutput {
  type: 'flashcards';
  contentJson: {
    cards: Flashcard[];
  };
}

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  q: string;
  choices: string[];
  answer_index: number;
  explanation: string;
}

/**
 * Quiz output content
 */
export interface QuizOutput extends LessonOutput {
  type: 'quiz';
  contentJson: {
    questions: QuizQuestion[];
  };
}

/**
 * Response from the flashcard generation edge function
 */
interface GenerateFlashcardsResponse {
  flashcards: LessonOutput;
  quiz: LessonOutput;
}

/**
 * Fetch a lesson output by type
 */
export async function fetchLessonOutput(
  lessonId: string,
  type: LessonOutputType
): Promise<LessonOutput | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch lesson output: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    lessonId: data.lesson_id,
    type: data.type,
    status: data.status,
    contentJson: data.content_json,
    error: data.error,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Fetch flashcards for a lesson
 */
export async function fetchFlashcards(lessonId: string): Promise<FlashcardOutput | null> {
  const output = await fetchLessonOutput(lessonId, 'flashcards');
  return output as FlashcardOutput | null;
}

/**
 * Fetch quiz for a lesson
 */
export async function fetchQuiz(lessonId: string): Promise<QuizOutput | null> {
  const output = await fetchLessonOutput(lessonId, 'quiz');
  return output as QuizOutput | null;
}

/**
 * Generate flashcards for a lesson (calls Edge Function)
 */
export async function generateFlashcards(
  lessonId: string,
  count: number = 10
): Promise<FlashcardOutput> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_flashcards',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI',
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        count: Math.max(10, Math.min(25, count)),
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(errorData.error?.message || `Failed to generate flashcards: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    userId: data.user_id,
    lessonId: data.lesson_id,
    type: 'flashcards',
    status: data.status,
    contentJson: data.content_json,
    error: data.error || null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Generate quiz for a lesson (calls Edge Function)
 */
export async function generateQuiz(
  lessonId: string,
  count: number = 5
): Promise<QuizOutput> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_quiz',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI',
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        count: Math.max(5, Math.min(15, count)),
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(errorData.error?.message || `Failed to generate quiz: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    userId: data.user_id,
    lessonId: data.lesson_id,
    type: 'quiz',
    status: data.status,
    contentJson: data.content_json,
    error: data.error || null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Generate flashcards and quiz for a lesson (calls both Edge Functions)
 * @deprecated Use generateFlashcards() and generateQuiz() separately for better caching
 */
export async function generateFlashcardsAndQuiz(
  lessonId: string,
  count: number = 15
): Promise<GenerateFlashcardsResponse> {
  // Call both endpoints in parallel
  const [flashcards, quiz] = await Promise.all([
    generateFlashcards(lessonId, count),
    generateQuiz(lessonId, Math.ceil(count / 3)), // 1/3 as many quiz questions
  ]);
  
  return { flashcards, quiz };
}

/**
 * Get or generate flashcards - convenience function
 * Checks if flashcards exist, if not generates them
 */
export async function getOrGenerateFlashcards(
  lessonId: string,
  forceRegenerate: boolean = false
): Promise<FlashcardOutput> {
  if (!forceRegenerate) {
    const existing = await fetchFlashcards(lessonId);
    if (existing && existing.status === 'ready') {
      return existing;
    }
  }

  // Generate new flashcards using the new endpoint
  return await generateFlashcards(lessonId, 10);
}

/**
 * Get or generate quiz - convenience function
 * Checks if quiz exists, if not generates it
 */
export async function getOrGenerateQuiz(
  lessonId: string,
  forceRegenerate: boolean = false
): Promise<QuizOutput> {
  if (!forceRegenerate) {
    const existing = await fetchQuiz(lessonId);
    if (existing && existing.status === 'ready') {
      return existing;
    }
  }

  // Generate new quiz using the new endpoint
  return await generateQuiz(lessonId, 5);
}
