import { supabase } from '../config/supabase';

export interface YouTubeVideo {
  video_id: string;
  title: string;
  channel_name: string;
  duration_seconds: number;
  thumbnail_url: string;
  description?: string;
  is_primary?: boolean;
}

/**
 * Generate YouTube recommendations for a lesson
 */
export async function generateYouTubeRecommendations(
  lessonId: string
): Promise<{ videos: YouTubeVideo[]; search_queries: string[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/generate_youtube_recommendations',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI',
      },
      body: JSON.stringify({ lesson_id: lessonId }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(errorData.error?.message || `Failed to generate recommendations: ${response.status}`);
  }

  const data = await response.json();
  return {
    videos: data.videos,
    search_queries: data.search_queries,
  };
}

/**
 * Fetch YouTube resources for a lesson
 */
export async function fetchYouTubeResources(lessonId: string): Promise<YouTubeVideo[]> {
  try {
    const { data, error } = await supabase
      .from('youtube_lesson_resources')
      .select(`
        lesson_id,
        video_id,
        is_primary,
        added_at,
        youtube_videos (
          video_id,
          title,
          channel_name,
          duration_seconds,
          thumbnail_url,
          description
        )
      `)
      .eq('lesson_id', lessonId)
      .order('added_at', { ascending: false });

    if (error) {
      // If tables don't exist, return empty array instead of throwing
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return [];
      }
      throw new Error(`Failed to fetch YouTube resources: ${error.message}`);
    }

    if (!data) return [];

    return data.map((item: any) => ({
      video_id: item.video_id,
      title: item.youtube_videos.title,
      channel_name: item.youtube_videos.channel_name,
      duration_seconds: item.youtube_videos.duration_seconds,
      thumbnail_url: item.youtube_videos.thumbnail_url,
      description: item.youtube_videos.description,
      is_primary: item.is_primary,
    }));
  } catch (error) {
    // Silently fail and return empty array
    // Don't log errors to avoid console spam
    return [];
  }
}
