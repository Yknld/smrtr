import { supabase, SUPABASE_URL } from '../config/supabase';

// Cache for pre-loaded podcast data
const podcastCache = new Map<string, {
  episode: PodcastEpisode | null;
  segments: PodcastSegment[];
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Podcast episode status
 */
export type PodcastStatus = 'queued' | 'scripting' | 'voicing' | 'ready' | 'failed';

/**
 * Podcast episode from podcast_episodes table
 */
export interface PodcastEpisode {
  id: string;
  userId: string;
  lessonId: string;
  status: PodcastStatus;
  title: string | null;
  language: string;
  voiceAId: string;
  voiceBId: string;
  totalSegments: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Podcast segment from podcast_segments table
 */
export interface PodcastSegment {
  id: string;
  episodeId: string;
  seq: number;
  speaker: 'a' | 'b';
  text: string;
  ttsStatus: 'queued' | 'generating' | 'ready' | 'failed';
  audioBucket: string | null;
  audioPath: string | null;
  durationMs: number | null;
  signedUrl?: string;
}

/**
 * Podcast data structure (legacy asset-based)
 */
export interface PodcastAsset {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  courseColor?: string;
  storageUrl: string;
  durationMs?: number;
  createdAt: Date;
}

export interface CourseWithPodcasts {
  id: string;
  title: string;
  color?: string;
  podcastCount: number;
  lastPodcastAt: Date;
}

export interface LessonPodcast {
  id: string;
  lessonId: string;
  lessonTitle: string;
  storageUrl: string;
  durationMs?: number;
  createdAt: Date;
}

/**
 * Fetch all courses that have podcasts
 */
export async function fetchCoursesWithPodcasts(): Promise<CourseWithPodcasts[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch courses with podcast episodes (status = 'ready')
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      color,
      lessons!inner (
        id,
        podcast_episodes!inner (
          id,
          status,
          created_at
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('lessons.podcast_episodes.status', 'ready')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch courses with podcasts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform and aggregate
  const coursesMap = new Map<string, CourseWithPodcasts>();

  for (const course of data) {
    if (!coursesMap.has(course.id)) {
      const lessons = (course as any).lessons || [];
      let podcastCount = 0;
      let latestDate: Date | null = null;

      for (const lesson of lessons) {
        const episodes = lesson.podcast_episodes || [];
        podcastCount += episodes.length;
        
        for (const episode of episodes) {
          const episodeDate = new Date(episode.created_at);
          if (!latestDate || episodeDate > latestDate) {
            latestDate = episodeDate;
          }
        }
      }

      if (podcastCount > 0 && latestDate) {
        coursesMap.set(course.id, {
          id: course.id,
          title: course.title,
          color: course.color,
          podcastCount,
          lastPodcastAt: latestDate,
        });
      }
    }
  }

  return Array.from(coursesMap.values())
    .sort((a, b) => b.lastPodcastAt.getTime() - a.lastPodcastAt.getTime());
}

/**
 * Fetch all lessons with podcasts for a specific course
 */
export async function fetchCoursePodcasts(courseId: string): Promise<LessonPodcast[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch lessons with ready podcast episodes
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id,
      title,
      podcast_episodes!inner (
        id,
        status,
        created_at
      )
    `)
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('podcast_episodes.status', 'ready')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch course podcasts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform to flat list of podcasts
  const podcasts: LessonPodcast[] = [];

  for (const lesson of data) {
    const episodes = (lesson as any).podcast_episodes || [];
    
    for (const episode of episodes) {
      // For podcasts made up of segments, we don't need a signed URL for the whole file
      // The player will fetch segments individually. We just need a placeholder.
      // The episode ID serves as the identifier
      podcasts.push({
        id: episode.id,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        storageUrl: '', // Not used for segment-based podcasts
        durationMs: undefined, // Will be calculated from segments when played
        createdAt: new Date(episode.created_at),
      });
    }
  }

  return podcasts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Fetch all podcasts across all courses
 */
export async function fetchAllPodcasts(): Promise<PodcastAsset[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('lesson_assets')
    .select(`
      id,
      lesson_id,
      storage_bucket,
      storage_path,
      duration_ms,
      created_at,
      lessons!inner (
        id,
        title,
        course_id,
        courses!inner (
          id,
          title,
          color
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('kind', 'audio')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch all podcasts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform to podcast assets with URLs
  const podcasts: PodcastAsset[] = [];

  for (const asset of data) {
    const lesson = (asset as any).lessons;
    const course = lesson?.courses;

    if (lesson && course) {
      // Generate signed URL
      const { data: urlData } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);

      if (urlData?.signedUrl) {
        podcasts.push({
          id: asset.id,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          courseId: course.id,
          courseTitle: course.title,
          courseColor: course.color,
          storageUrl: urlData.signedUrl,
          durationMs: asset.duration_ms,
          createdAt: new Date(asset.created_at),
        });
      }
    }
  }

  return podcasts;
}

/**
 * Create a new podcast episode for a lesson (calls Edge Function)
 */
export async function createPodcastEpisode(
  lessonId: string,
  options?: {
    language?: string;
    voiceAId?: string;
    voiceBId?: string;
  }
): Promise<{ episodeId: string; status: PodcastStatus }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/podcast_create',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        ...options,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to create podcast: ${response.status}`);
  }

  const data = await response.json();
  return {
    episodeId: data.episode_id,
    status: data.status,
  };
}

/**
 * Fetch podcast episode for a lesson
 */
export async function generatePodcastScript(
  episodeId: string,
  options?: {
    durationMin?: number;
    style?: string;
  }
): Promise<{ episodeId: string; title: string; totalSegments: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const url = `${SUPABASE_URL}/functions/v1/podcast_generate_script`;
  console.log('📡 Calling podcast_generate_script:', url);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        episode_id: episodeId,
        duration_min: options?.durationMin || 8,
        style: options?.style || 'direct_review',
      }),
    });
  } catch (networkError: any) {
    console.error('❌ Network error calling edge function:', networkError);
    throw new Error(`Network error: ${networkError.message}`);
  }

  console.log('📥 Response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Failed to generate podcast script';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      console.error('❌ Edge function error:', errorData);
    } catch (parseError) {
      console.error('❌ Could not parse error response');
      const text = await response.text();
      console.error('Raw error response:', text);
      errorMessage = `HTTP ${response.status}: ${text}`;
    }
    throw new Error(errorMessage);
  }

  let data;
  try {
    const responseText = await response.text();
    console.log('📥 Response text length:', responseText.length);
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from server');
    }
    
    data = JSON.parse(responseText);
  } catch (parseError: any) {
    console.error('❌ Failed to parse response:', parseError);
    throw new Error(`Invalid JSON response: ${parseError.message}`);
  }

  console.log('✅ Script generated successfully:', data);
  return {
    episodeId: data.episode_id,
    title: data.title,
    totalSegments: data.total_segments,
  };
}

export async function generatePodcastAudio(
  episodeId: string
): Promise<{ episodeId: string; processed: number; failed: number; status: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const url = `${SUPABASE_URL}/functions/v1/podcast_generate_audio`;
  console.log('📡 Calling podcast_generate_audio:', url);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        episode_id: episodeId,
      }),
    });
  } catch (networkError: any) {
    console.error('❌ Network error calling edge function:', networkError);
    throw new Error(`Network error: ${networkError.message}`);
  }

  console.log('📥 Response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Failed to generate podcast audio';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      console.error('❌ Edge function error:', errorData);
    } catch (parseError) {
      const text = await response.text();
      console.error('Raw error response:', text);
      errorMessage = `HTTP ${response.status}: ${text}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('✅ Audio generation response:', data);
  return {
    episodeId: data.episode_id,
    processed: data.processed,
    failed: data.failed,
    status: data.status,
  };
}

export async function fetchPodcastEpisode(lessonId: string): Promise<PodcastEpisode | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch podcast episode: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    lessonId: data.lesson_id,
    status: data.status,
    title: data.title,
    language: data.language,
    voiceAId: data.voice_a_id,
    voiceBId: data.voice_b_id,
    totalSegments: data.total_segments,
    error: data.error,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Fetch podcast segments for an episode
 */
export async function fetchPodcastSegments(episodeId: string): Promise<PodcastSegment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('podcast_segments')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('user_id', user.id)
    .order('seq', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch podcast segments: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Generate public URLs for segments with audio
  // Note: tts_audio bucket should be configured as public in Supabase
  const segments: PodcastSegment[] = [];
  
  for (const segment of data) {
    let signedUrl: string | undefined;
    
    if (segment.audio_bucket && segment.audio_path && segment.tts_status === 'ready') {
      // Try public URL first (faster, no auth needed if bucket is public)
      const { data: publicUrlData } = supabase.storage
        .from(segment.audio_bucket)
        .getPublicUrl(segment.audio_path);
      
      if (publicUrlData?.publicUrl) {
        signedUrl = publicUrlData.publicUrl;
        console.log(`✅ Generated public URL for segment ${segment.seq}`);
      } else {
        // Fallback to signed URL if public fails
        const { data: urlData, error: urlError } = await supabase.storage
          .from(segment.audio_bucket)
          .createSignedUrl(segment.audio_path, 7200); // 2 hours

        if (urlError) {
          console.error(`❌ Failed to generate signed URL for segment ${segment.seq}:`, urlError);
          console.error(`   Bucket: ${segment.audio_bucket}, Path: ${segment.audio_path}`);
        } else if (urlData?.signedUrl) {
          signedUrl = urlData.signedUrl;
          console.log(`✅ Generated signed URL for segment ${segment.seq}`);
        } else {
          console.warn(`⚠️ No URL returned for segment ${segment.seq}`);
        }
      }
    } else {
      console.log(`⏭️ Segment ${segment.seq}: bucket=${segment.audio_bucket}, path=${segment.audio_path}, status=${segment.tts_status}`);
    }

    segments.push({
      id: segment.id,
      episodeId: segment.episode_id,
      seq: segment.seq,
      speaker: segment.speaker,
      text: segment.text,
      ttsStatus: segment.tts_status,
      audioBucket: segment.audio_bucket,
      audioPath: segment.audio_path,
      durationMs: segment.duration_ms,
      signedUrl,
    });
  }

  console.log(`📊 Fetched ${segments.length} segments, ${segments.filter(s => s.signedUrl).length} with URLs`);
  return segments;
}

/**
 * Get cached podcast data for a lesson
 * DISABLED: Always return null to force fresh backend checks
 */
export function getCachedPodcast(lessonId: string): {
  episode: PodcastEpisode | null;
  segments: PodcastSegment[];
} | null {
  // Cache disabled - always fetch fresh from backend
  return null;
}

/**
 * Pre-load podcast data in the background
 * This fetches the episode and segments (if ready) and caches them
 * Returns immediately - doesn't wait for completion
 */
export async function preloadPodcast(lessonId: string): Promise<void> {
  try {
    console.log(`📥 Fetching fresh podcast data for lesson ${lessonId}...`);
    
    // Fetch episode
    const episode = await fetchPodcastEpisode(lessonId);
    
    // If ready, also fetch segments
    let segments: PodcastSegment[] = [];
    if (episode && episode.status === 'ready') {
      segments = await fetchPodcastSegments(episode.id);
    }
    
    // Cache disabled - no longer storing in cache
    
    console.log(`✅ Pre-loaded podcast: status=${episode?.status}, segments=${segments.length}`);
  } catch (error) {
    console.error('Failed to pre-load podcast:', error);
    // Don't throw - pre-loading is best-effort
  }
}

/**
 * Generate immediate acknowledgment for join-in (uses turbo TTS - 1-2 seconds)
 */
export async function acknowledgeJoinIn(
  episodeId: string,
  currentSegmentIndex: number,
  userInput: string
): Promise<PodcastSegment> {
  console.log('🎙️ Requesting acknowledgment...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${supabase.supabaseUrl}/functions/v1/podcast_join_in_acknowledge`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        episode_id: episodeId,
        current_segment_index: currentSegmentIndex,
        user_input: userInput,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('📥 Acknowledgment response status:', response.status);
    console.error('📥 Acknowledgment response text:', errorText);
    throw new Error(`Failed to generate acknowledgment: ${response.status}`);
  }

  const result = await response.json();
  console.log(`✅ Acknowledgment ready`);

  return result.acknowledgment_segment;
}

/**
 * Join in to podcast - ask a question and get AI response
 */
export async function joinInPodcast(
  episodeId: string,
  currentSegmentIndex: number,
  userInput: string,
  lessonId: string
): Promise<PodcastSegment[]> {
  console.log('🎤 Sending join-in request...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${supabase.supabaseUrl}/functions/v1/podcast_join_in`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        episode_id: episodeId,
        current_segment_index: currentSegmentIndex,
        user_input: userInput,
        lesson_id: lessonId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('📥 Join-in response status:', response.status);
    console.error('📥 Join-in response text:', errorText);
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      throw new Error(`Failed to join podcast: ${errorText}`);
    }
    throw new Error(errorData.error || `Failed to join podcast: ${response.status}`);
  }

  const result = await response.json();
  console.log(`✅ Join-in segments created: ${result.join_in_segments?.length || 0}`);

  // Transform to PodcastSegment format
  const segments: PodcastSegment[] = result.join_in_segments.map((seg: any) => ({
    id: seg.id,
    episodeId: seg.episode_id,
    seq: seg.seq,
    speaker: seg.speaker,
    text: seg.text,
    ttsStatus: seg.tts_status,
    audioBucket: seg.audio_bucket,
    audioPath: seg.audio_path,
    durationMs: seg.duration_ms,
  }));

  return segments;
}

/**
 * Clear podcast cache for a specific lesson
 */
export function clearPodcastCache(lessonId?: string): void {
  if (lessonId) {
    console.log(`🗑️ Clearing cache for lesson: ${lessonId}`);
    podcastCache.delete(lessonId);
  } else {
    console.log(`🗑️ Clearing all podcast cache`);
    podcastCache.clear();
  }
}
