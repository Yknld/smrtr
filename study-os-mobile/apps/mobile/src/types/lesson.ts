/**
 * Lesson Type
 * Maps to 'lessons' table in Supabase
 */

export type LessonStatus = 'draft' | 'ready' | 'processing' | 'failed';
export type LessonSourceType = 'upload' | 'live_session' | 'import';

export interface Lesson {
  /** Unique identifier (UUID) */
  id: string;
  
  /** User who owns this lesson (UUID) */
  userId: string;
  
  /** Course this lesson belongs to (UUID) */
  courseId: string;
  
  /** Lesson title */
  title: string;
  
  /** How lesson was created */
  sourceType: LessonSourceType;
  
  /** Processing status */
  status: LessonStatus;
  
  /** Last time this lesson was opened */
  lastOpenedAt?: Date | null;
  
  /** When the lesson was created */
  createdAt: Date;
}

/**
 * Lesson with outputs metadata
 */
export interface LessonWithOutputs extends Lesson {
  /** Whether lesson has generated summary */
  hasSummary: boolean;
  
  /** Whether lesson has generated flashcards */
  hasFlashcards: boolean;
  
  /** Whether lesson has generated quiz */
  hasQuiz: boolean;
  
  /** Whether lesson has podcast audio */
  hasPodcast: boolean;
  
  /** Whether lesson has generated video */
  hasVideo: boolean;
}

/**
 * Raw lesson response from Supabase (snake_case)
 */
export interface LessonRow {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  source_type: LessonSourceType;
  status: LessonStatus;
  last_opened_at?: string | null;
  created_at: string;
}

/**
 * Transform Supabase row to Lesson type
 */
export function transformLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    title: row.title,
    sourceType: row.source_type,
    status: row.status,
    lastOpenedAt: row.last_opened_at ? new Date(row.last_opened_at) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Status display labels
 */
export const LessonStatusLabels: Record<LessonStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  processing: 'Processing',
  failed: 'Failed',
};

/**
 * Status colors
 */
export const LessonStatusColors: Record<LessonStatus, string> = {
  draft: '#8A8A8A',
  ready: '#4ADE80',
  processing: '#60A5FA',
  failed: '#F87171',
};
