# Podcast Get

Get podcast episode metadata and all segments for playback.

## Purpose

Retrieves complete podcast episode data including metadata and all dialogue segments ordered by sequence. Used by the mobile app to play podcast episodes.

## Endpoint

```
GET /functions/v1/podcast_get?episode_id=<uuid>
```

## Authentication

Requires valid JWT token in Authorization header. RLS policies ensure users can only access their own podcast episodes.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `episode_id` | UUID | Yes | ID of the podcast episode to fetch |

### Headers

```
Authorization: Bearer <jwt_token>
```

## Response

### Success (200)

```typescript
{
  episode: {
    id: string;
    lesson_id: string;
    title: string;
    status: "queued" | "scripting" | "voicing" | "ready" | "failed";
    language: string;
    voice_a_id: string;
    voice_b_id: string;
    total_segments: number;
  },
  segments: [
    {
      seq: number;
      speaker: "a" | "b";
      text: string;
      tts_status: "queued" | "generating" | "ready" | "failed";
      audio_bucket: string | null;
      audio_path: string | null;
      duration_ms: number | null;
    }
  ]
}
```

**Notes:**
- Segments are always ordered by `seq` (ascending)
- `audio_bucket` and `audio_path` are null if TTS hasn't completed
- `duration_ms` is null until audio is generated

### Errors

| Code | Error | Meaning |
|------|-------|---------|
| 400 | Missing required parameter: episode_id | Query parameter missing |
| 400 | Invalid episode_id format | Not a valid UUID |
| 401 | Missing authorization header | JWT not provided |
| 401 | Invalid or expired session | JWT validation failed |
| 404 | Episode not found or access denied | Episode doesn't exist or user doesn't own it |
| 500 | Internal server error | Database or server error |

## Examples

### cURL

```bash
# Get episode data
curl "https://your-project.supabase.co/functions/v1/podcast_get?episode_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.'
```

### JavaScript/TypeScript

```typescript
import { supabase } from './supabase';

async function getPodcastEpisode(episodeId: string) {
  const { data, error } = await supabase.functions.invoke('podcast_get', {
    method: 'GET',
    params: { episode_id: episodeId },
  });
  
  if (error) {
    console.error('Failed to fetch episode:', error);
    return null;
  }
  
  console.log(`Episode: ${data.episode.title}`);
  console.log(`Segments: ${data.segments.length}`);
  
  return data;
}

// Usage
const episode = await getPodcastEpisode('123e4567-e89b-12d3-a456-426614174000');
```

### React Native

```typescript
import { supabase } from '@/lib/supabase';

export async function fetchPodcastEpisode(episodeId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('podcast_get', {
      method: 'GET',
      params: { episode_id: episodeId },
    });
    
    if (error) throw error;
    
    return {
      episode: data.episode,
      segments: data.segments,
    };
  } catch (err) {
    console.error('Error fetching podcast:', err);
    throw err;
  }
}

// In your component
const loadPodcast = async () => {
  const { episode, segments } = await fetchPodcastEpisode(episodeId);
  
  setTitle(episode.title);
  setSegments(segments);
  
  // Check if all audio is ready
  const allReady = segments.every(s => s.tts_status === 'ready');
  setCanPlay(allReady);
};
```

## Usage in Podcast Player

```typescript
import { fetchPodcastEpisode } from '@/services/podcast';
import { Audio } from 'expo-av';

class PodcastPlayer {
  private currentSegmentIndex = 0;
  private segments: any[] = [];
  private sound: Audio.Sound | null = null;
  
  async loadEpisode(episodeId: string) {
    // Fetch episode data
    const { episode, segments } = await fetchPodcastEpisode(episodeId);
    
    this.segments = segments;
    this.currentSegmentIndex = 0;
    
    console.log(`Loaded: ${episode.title}`);
    console.log(`Total segments: ${segments.length}`);
    
    // Validate all segments have audio
    const missingAudio = segments.filter(s => !s.audio_path);
    if (missingAudio.length > 0) {
      console.warn(`${missingAudio.length} segments missing audio`);
    }
    
    return episode;
  }
  
  async playSegment(index: number) {
    const segment = this.segments[index];
    
    if (!segment.audio_path) {
      console.error('Segment has no audio');
      return;
    }
    
    // Construct audio URL
    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${segment.audio_bucket}/${segment.audio_path}`;
    
    // Load and play
    const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
    this.sound = sound;
    
    await sound.playAsync();
    
    // Listen for completion
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        this.playNext();
      }
    });
  }
  
  async playNext() {
    if (this.currentSegmentIndex < this.segments.length - 1) {
      this.currentSegmentIndex++;
      await this.playSegment(this.currentSegmentIndex);
    } else {
      console.log('Episode complete');
    }
  }
  
  getCurrentText() {
    return this.segments[this.currentSegmentIndex]?.text || '';
  }
}

// Usage
const player = new PodcastPlayer();
await player.loadEpisode('episode-id');
await player.playSegment(0);
```

## Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Typical latency | < 300ms | For episodes with < 100 segments |
| Max segments | No limit | Returns all segments |
| Database queries | 2 | Episode + segments (both indexed) |
| Cached | No | Always fetches fresh data |

## Security

- ✅ **JWT required:** All requests must be authenticated
- ✅ **RLS enforced:** Users can only access their own episodes
- ✅ **Ownership verified:** Episode must belong to authenticated user
- ✅ **No injection:** Parameterized queries only

## Testing

### Quick Test

```bash
# Get JWT
JWT=$(./get-jwt.sh user1@test.com password123 | grep "export JWT" | cut -d "'" -f2)

# Create test episode (using podcast_create function)
EPISODE_ID=$(curl -s -X POST "https://your-project.supabase.co/functions/v1/podcast_create" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id":"YOUR_LESSON_ID"}' | jq -r '.episode_id')

# Get episode
curl "https://your-project.supabase.co/functions/v1/podcast_get?episode_id=$EPISODE_ID" \
  -H "Authorization: Bearer $JWT" | jq '.'
```

### Expected Response

```json
{
  "episode": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "lesson_id": "789abcde-f012-3456-7890-abcdef123456",
    "title": "Understanding Design Sprints",
    "status": "ready",
    "language": "en",
    "voice_a_id": "gemini_voice_a",
    "voice_b_id": "gemini_voice_b",
    "total_segments": 15
  },
  "segments": [
    {
      "seq": 0,
      "speaker": "a",
      "text": "Welcome to today's discussion on design sprints!",
      "tts_status": "ready",
      "audio_bucket": "podcast-audio",
      "audio_path": "episodes/123e4567/segment-0.mp3",
      "duration_ms": 3500
    },
    {
      "seq": 1,
      "speaker": "b",
      "text": "Thanks for having me! Design sprints are fascinating.",
      "tts_status": "ready",
      "audio_bucket": "podcast-audio",
      "audio_path": "episodes/123e4567/segment-1.mp3",
      "duration_ms": 2800
    }
    // ... more segments
  ]
}
```

## Deployment

```bash
cd /path/to/study-os-mobile

# Deploy function
supabase functions deploy podcast_get --no-verify-jwt

# Verify deployment
supabase functions list | grep podcast_get
```

## Related Functions

- `podcast_create` - Create new podcast episode
- `notes_commit_from_segments` - Commit transcript segments to notes

## Database Schema

### Tables Used

**podcast_episodes:**
- Primary query: Single episode by ID
- RLS: Ensures user owns episode

**podcast_segments:**
- Query: All segments for episode
- Ordered by: `seq` ascending
- RLS: Ensures user owns segments

### Indexes

```sql
-- Episode lookup (primary key)
CREATE INDEX ON podcast_episodes(id, user_id);

-- Segment lookup and ordering
CREATE INDEX ON podcast_segments(episode_id, seq);
```

## Troubleshooting

### "Episode not found or access denied"

**Causes:**
- Episode doesn't exist
- User doesn't own the episode
- Invalid episode_id

**Solution:** Verify episode exists and belongs to authenticated user.

### Segments missing audio

**Causes:**
- TTS generation not complete
- `tts_status` not 'ready'

**Solution:** Check `tts_status` field. If 'generating', wait for completion.

### High latency

**Causes:**
- Large number of segments (> 1000)
- Missing database indexes

**Solution:** Verify indexes exist on `podcast_segments(episode_id, seq)`.

---

**Status:** ✅ Ready for deployment  
**Auth:** JWT required, RLS enforced  
**Method:** GET  
**Returns:** Episode metadata + segments
