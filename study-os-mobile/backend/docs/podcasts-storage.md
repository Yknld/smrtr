# Podcast Audio Storage Documentation

## Overview

This document describes the storage setup for AI-generated podcast audio in the StudyOS mobile app. Podcast episodes use the existing `tts_audio` bucket with a dedicated path convention to organize audio segments.

## Storage Bucket

**Bucket:** `tts_audio` (shared with live session TTS audio)

**Configuration:**
- Public: `false` (requires authentication)
- File size limit: 10MB per file
- Allowed MIME types: `audio/mpeg`, `audio/mp3`

The bucket is already configured in migration `009_storage_setup.sql`.

## Path Convention for Podcasts

Podcast audio segments use a specific path structure:

```
podcasts/{user_id}/{episode_id}/seg_{seq}_{speaker}.mp3
```

**Path Components:**
- `podcasts/` - Fixed prefix for podcast audio (distinguishes from live session TTS)
- `{user_id}` - UUID of the user who owns the episode
- `{episode_id}` - UUID of the podcast episode (from `podcast_episodes` table)
- `seg_{seq}_{speaker}.mp3` - Segment file with sequence number and speaker ID

**Examples:**
```
podcasts/550e8400-e29b-41d4-a716-446655440000/abc-123-def/seg_1_a.mp3
podcasts/550e8400-e29b-41d4-a716-446655440000/abc-123-def/seg_2_b.mp3
podcasts/550e8400-e29b-41d4-a716-446655440000/abc-123-def/seg_3_a.mp3
```

This convention ensures:
- ✅ User isolation (first segment is `user_id`)
- ✅ All segments for an episode are grouped together
- ✅ Segments are easily sortable by sequence number
- ✅ Speaker identification (a = host, b = co-host)

## Access Control

The existing RLS policies on the `tts_audio` bucket enforce user isolation:

```sql
-- Users can only access files under their own user_id prefix
(storage.foldername(name))[1] = auth.uid()::text
```

**What this means:**
- ✅ Users can read/write only to `podcasts/{their_user_id}/...`
- ❌ Users cannot access `podcasts/{other_user_id}/...`
- ✅ Edge Functions (service role) can write to any user's folder

**Security Model:**
1. Mobile client authenticates user
2. Client builds path: `podcasts/{auth.uid()}/{episode_id}/seg_{seq}_{speaker}.mp3`
3. Supabase policies verify the path starts with the user's ID
4. Access granted only if user_id matches authenticated user

## Mobile Client Usage

### Prerequisites

Ensure the user is authenticated:

```typescript
import { supabase } from './supabaseClient';

// User must be authenticated
const user = supabase.auth.user();
if (!user) {
  throw new Error('User not authenticated');
}
```

### Playing Podcast Audio

The mobile app should fetch signed URLs for each segment and play them in sequence:

```typescript
import { Audio } from 'expo-av';

interface PodcastSegment {
  id: string;
  episode_id: string;
  seq: number;
  speaker: 'a' | 'b';
  audio_bucket: string | null;
  audio_path: string | null;
  duration_ms: number | null;
}

async function getPodcastSegmentUrl(
  segment: PodcastSegment,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  if (!segment.audio_bucket || !segment.audio_path) {
    return null; // Segment not yet generated
  }

  const { data, error } = await supabase.storage
    .from(segment.audio_bucket)
    .createSignedUrl(segment.audio_path, expiresIn);

  if (error) {
    console.error('Failed to get signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

async function playPodcastSegment(segment: PodcastSegment): Promise<Audio.Sound | null> {
  const signedUrl = await getPodcastSegmentUrl(segment);
  
  if (!signedUrl) {
    console.warn('Audio not available for segment:', segment.seq);
    return null;
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: signedUrl },
    { shouldPlay: true }
  );

  return sound;
}
```

### Playing Full Episode

To play an entire episode, fetch all segments and queue them:

```typescript
async function playPodcastEpisode(episodeId: string) {
  // Fetch all segments for the episode
  const { data: segments, error } = await supabase
    .from('podcast_segments')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('tts_status', 'ready')
    .order('seq', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch segments: ${error.message}`);
  }

  if (!segments || segments.length === 0) {
    throw new Error('No audio segments available');
  }

  // Get signed URLs for all segments
  const segmentsWithUrls = await Promise.all(
    segments.map(async (segment) => ({
      ...segment,
      signedUrl: await getPodcastSegmentUrl(segment, 7200), // 2 hours
    }))
  );

  // Play segments in sequence
  for (const segment of segmentsWithUrls) {
    if (!segment.signedUrl) continue;

    const { sound } = await Audio.Sound.createAsync(
      { uri: segment.signedUrl },
      { shouldPlay: true }
    );

    // Wait for segment to finish
    await new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          resolve(null);
        }
      });
    });

    await sound.unloadAsync();
  }
}
```

### Checking Segment Availability

Before attempting playback, check if segments are ready:

```typescript
async function checkPodcastEpisodeStatus(episodeId: string): Promise<{
  totalSegments: number;
  readySegments: number;
  isComplete: boolean;
}> {
  const { data: episode, error: episodeError } = await supabase
    .from('podcast_episodes')
    .select('status, total_segments')
    .eq('id', episodeId)
    .single();

  if (episodeError) {
    throw new Error(`Failed to fetch episode: ${episodeError.message}`);
  }

  const { count: readyCount, error: countError } = await supabase
    .from('podcast_segments')
    .select('*', { count: 'exact', head: true })
    .eq('episode_id', episodeId)
    .eq('tts_status', 'ready');

  if (countError) {
    throw new Error(`Failed to count segments: ${countError.message}`);
  }

  return {
    totalSegments: episode.total_segments,
    readySegments: readyCount || 0,
    isComplete: episode.status === 'ready' && readyCount === episode.total_segments,
  };
}

// Usage
const status = await checkPodcastEpisodeStatus(episodeId);
console.log(`Episode progress: ${status.readySegments}/${status.totalSegments}`);

if (status.isComplete) {
  await playPodcastEpisode(episodeId);
} else {
  console.log('Episode is still being generated...');
}
```

### Preloading Audio URLs

For better UX, preload signed URLs when the user opens the episode screen:

```typescript
interface CachedSegment {
  segment: PodcastSegment;
  signedUrl: string;
  expiresAt: Date;
}

class PodcastPlayer {
  private cache: Map<string, CachedSegment> = new Map();

  async preloadEpisode(episodeId: string): Promise<void> {
    const { data: segments, error } = await supabase
      .from('podcast_segments')
      .select('*')
      .eq('episode_id', episodeId)
      .eq('tts_status', 'ready')
      .order('seq', { ascending: true });

    if (error || !segments) {
      throw new Error('Failed to fetch segments');
    }

    // Preload signed URLs (valid for 2 hours)
    await Promise.all(
      segments.map(async (segment) => {
        const signedUrl = await getPodcastSegmentUrl(segment, 7200);
        if (signedUrl) {
          this.cache.set(segment.id, {
            segment,
            signedUrl,
            expiresAt: new Date(Date.now() + 7200 * 1000),
          });
        }
      })
    );
  }

  getCachedUrl(segmentId: string): string | null {
    const cached = this.cache.get(segmentId);
    if (!cached) return null;

    // Check if URL is still valid
    if (cached.expiresAt < new Date()) {
      this.cache.delete(segmentId);
      return null;
    }

    return cached.signedUrl;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

## Edge Function Integration

Edge Functions (running with service role) can upload podcast audio to any user's folder:

```typescript
import { createClient } from '@supabase/supabase-js';

// Service role client bypasses RLS
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function uploadPodcastSegment(
  userId: string,
  episodeId: string,
  seq: number,
  speaker: 'a' | 'b',
  audioBuffer: ArrayBuffer
): Promise<string> {
  const fileName = `seg_${seq}_${speaker}.mp3`;
  const filePath = `podcasts/${userId}/${episodeId}/${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from('tts_audio')
    .upload(filePath, audioBuffer, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data.path;
}

// After uploading, update the segment record
async function updateSegmentAfterUpload(
  segmentId: string,
  audioPath: string,
  durationMs: number
) {
  const { error } = await supabaseAdmin
    .from('podcast_segments')
    .update({
      audio_bucket: 'tts_audio',
      audio_path: audioPath,
      duration_ms: durationMs,
      tts_status: 'ready',
    })
    .eq('id', segmentId);

  if (error) {
    throw new Error(`Failed to update segment: ${error.message}`);
  }
}
```

## Best Practices

### Path Construction
- Always use the authenticated user's ID: `supabase.auth.user()?.id`
- Never hardcode user IDs or episode IDs
- Use consistent file naming: `seg_{seq}_{speaker}.mp3`

### Signed URL Management
- Cache signed URLs to reduce API calls
- Set appropriate expiration times (1-2 hours for playback)
- Refresh URLs if they expire during playback

### Playback Performance
- Preload signed URLs when opening episode screen
- Consider downloading segments for offline playback
- Implement error handling for network issues

### Error Handling
- Check if audio is available before attempting playback
- Handle expired signed URLs gracefully
- Provide user feedback for generation in progress

### Storage Cleanup
- Delete segment audio files when episode is deleted (cascade via RLS)
- Consider implementing a cleanup job for failed/orphaned segments
- Monitor storage usage per user

## Troubleshooting

### "Audio not available"
- Check `podcast_segments.tts_status` - must be `'ready'`
- Verify `audio_bucket` and `audio_path` are not null
- Ensure episode status is `'ready'` or `'voicing'`

### "Signed URL expired"
- Regenerate signed URLs (valid for 1 hour by default)
- Implement automatic refresh when URLs expire
- Increase expiration time for long episodes

### "Policy not satisfied"
- Verify path starts with authenticated user's ID
- Check user is logged in before accessing storage
- Ensure `user_id` in database matches authenticated user

### "Playback interrupted"
- Network issues - implement retry logic
- Signed URL expired - refresh and resume
- Consider pre-downloading segments for critical episodes

## Related Documentation

- [Database Schema - Podcast Tables](./db-schema.md#podcast-system-tables)
- [Storage Setup Migration](../supabase/migrations/009_storage_setup.sql)
- [General Storage Documentation](./storage.md)
