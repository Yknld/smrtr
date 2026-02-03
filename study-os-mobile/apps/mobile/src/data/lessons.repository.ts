import { supabase } from '../config/supabase';
import {
  Lesson,
  LessonWithOutputs,
  LessonRow,
  LessonStatus,
  transformLesson,
} from '../types/lesson';

/**
 * Fetch all lessons for a specific course
 */
export async function fetchLessons(courseId: string): Promise<LessonWithOutputs[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch lessons with outputs metadata and assets
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id,
      user_id,
      course_id,
      title,
      source_type,
      status,
      last_opened_at,
      created_at,
      lesson_outputs (
        id,
        type
      ),
      lesson_assets (
        id,
        kind
      )
    `)
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch lessons: ${error.message}`);
  }

  // Transform and add outputs and assets metadata
  return (data || []).map((row: any) => {
    const lesson = transformLesson(row as LessonRow);
    const outputs = row.lesson_outputs || [];
    const assets = row.lesson_assets || [];
    
    return {
      ...lesson,
      hasSummary: outputs.some((o: any) => o.type === 'summary'),
      hasFlashcards: outputs.some((o: any) => o.type === 'flashcards'),
      hasQuiz: outputs.some((o: any) => o.type === 'quiz'),
      hasPodcast: assets.some((a: any) => a.kind === 'audio'),
      hasVideo: assets.some((a: any) => a.kind === 'video'),
    };
  });
}

/**
 * Fetch a single lesson by ID with outputs metadata
 */
export async function fetchLessonById(lessonId: string): Promise<LessonWithOutputs | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id,
      user_id,
      course_id,
      title,
      source_type,
      status,
      last_opened_at,
      created_at,
      lesson_outputs (
        id,
        type
      ),
      lesson_assets (
        id,
        kind
      )
    `)
    .eq('id', lessonId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch lesson: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const lesson = transformLesson(data as LessonRow);
  const outputs = (data as any).lesson_outputs || [];
  const assets = (data as any).lesson_assets || [];

  return {
    ...lesson,
    hasSummary: outputs.some((o: any) => o.type === 'summary'),
    hasFlashcards: outputs.some((o: any) => o.type === 'flashcards'),
    hasQuiz: outputs.some((o: any) => o.type === 'quiz'),
    hasPodcast: assets.some((a: any) => a.kind === 'audio'),
    hasVideo: assets.some((a: any) => a.kind === 'video'),
  };
}

/**
 * Filter lessons by status
 */
export function filterLessons(
  lessons: LessonWithOutputs[],
  filter: 'all' | LessonStatus
): LessonWithOutputs[] {
  if (filter === 'all') return lessons;
  return lessons.filter(l => l.status === filter);
}

/**
 * Create a new lesson
 */
export async function createLesson(
  courseId: string,
  title: string,
  sourceType: string = 'upload'
): Promise<Lesson> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      user_id: user.id,
      course_id: courseId,
      title,
      source_type: sourceType,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create lesson: ${error.message}`);
  }

  return transformLesson(data as LessonRow);
}

/**
 * Update a lesson's title
 */
export async function updateLessonTitle(
  lessonId: string,
  title: string
): Promise<Lesson> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('lessons')
    .update({ title })
    .eq('id', lessonId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update lesson: ${error.message}`);
  }

  return transformLesson(data as LessonRow);
}

/**
 * Delete a lesson from Supabase (and related outputs/assets via DB CASCADE). Only the owning user can delete.
 */
export async function deleteLesson(lessonId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to delete lesson: ${error.message}`);
  }
}
