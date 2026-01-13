/**
 * Course Type
 * Maps to 'courses' table in Supabase
 */

export interface Course {
  /** Unique identifier (UUID) */
  id: string;
  
  /** User who owns this course (UUID) */
  userId: string;
  
  /** Course title */
  title: string;
  
  /** Academic term (e.g., "Fall 2024", "Spring 2025") */
  term?: string | null;
  
  /** UI color code for visual organization (hex code) */
  color?: string | null;
  
  /** When the course was created */
  createdAt: Date;
}

/**
 * Course with aggregated metadata (for list views)
 */
export interface CourseWithMeta extends Course {
  /** Number of lessons in this course */
  lessonCount: number;
  
  /** Most recent lesson open time across all lessons */
  lastOpenedAt?: Date | null;
  
  /** Whether this course has any active lessons */
  hasActiveLessons: boolean;
  
  /** Whether this course is completed (derived from lesson statuses) */
  isCompleted: boolean;
}

/**
 * Raw course response from Supabase (snake_case)
 */
export interface CourseRow {
  id: string;
  user_id: string;
  title: string;
  term?: string | null;
  color?: string | null;
  created_at: string;
}

/**
 * Create course input
 */
export interface CreateCourseInput {
  title: string;
  term?: string;
  color?: string;
}

/**
 * Update course input
 */
export interface UpdateCourseInput {
  title?: string;
  term?: string;
  color?: string;
}

/**
 * Transform Supabase row to Course type
 */
export function transformCourse(row: CourseRow): Course {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    term: row.term,
    color: row.color,
    createdAt: new Date(row.created_at),
  };
}
