import { supabase } from '../config/supabase';
import {
  Course,
  CourseWithMeta,
  CourseRow,
  CreateCourseInput,
  UpdateCourseInput,
  transformCourse,
} from '../types/course';

/**
 * Fetch all courses for the current user with metadata
 */
export async function fetchCourses(): Promise<CourseWithMeta[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch courses with lesson aggregation
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      user_id,
      title,
      term,
      color,
      created_at,
      lessons (
        id,
        status,
        last_opened_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  // Transform and add metadata
  return (data || []).map((row: any) => {
    const course = transformCourse(row as CourseRow);
    const lessons = row.lessons || [];
    
    // Calculate metadata
    const lessonCount = lessons.length;
    const lastOpenedTimes = lessons
      .map((l: any) => l.last_opened_at)
      .filter(Boolean)
      .map((t: string) => new Date(t));
    const lastOpenedAt = lastOpenedTimes.length > 0
      ? new Date(Math.max(...lastOpenedTimes.map(d => d.getTime())))
      : null;
    
    const hasActiveLessons = lessons.some((l: any) => l.status === 'ready');
    const isCompleted = lessons.length > 0 && lessons.every((l: any) => l.status === 'ready');
    
    return {
      ...course,
      lessonCount,
      lastOpenedAt,
      hasActiveLessons,
      isCompleted,
    };
  });
}

/**
 * Filter courses by status
 */
export function filterCourses(
  courses: CourseWithMeta[],
  filter: 'all' | 'active' | 'completed'
): CourseWithMeta[] {
  switch (filter) {
    case 'active':
      return courses.filter(c => c.hasActiveLessons && !c.isCompleted);
    case 'completed':
      return courses.filter(c => c.isCompleted);
    case 'all':
    default:
      return courses;
  }
}

/**
 * Search courses by title or term
 */
export function searchCourses(
  courses: CourseWithMeta[],
  query: string
): CourseWithMeta[] {
  if (!query.trim()) return courses;
  
  const lowerQuery = query.toLowerCase();
  return courses.filter(course =>
    course.title.toLowerCase().includes(lowerQuery) ||
    course.term?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Create a new course
 */
export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('courses')
    .insert({
      user_id: user.id,
      title: input.title,
      term: input.term || null,
      color: input.color || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create course: ${error.message}`);
  }

  return transformCourse(data as CourseRow);
}

/**
 * Update a course
 */
export async function updateCourse(
  id: string,
  input: UpdateCourseInput
): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .update({
      title: input.title,
      term: input.term,
      color: input.color,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }

  return transformCourse(data as CourseRow);
}

/**
 * Delete a course
 */
export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }
}
