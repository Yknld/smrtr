# podcast_get - Quick Reference

## Endpoint

```
GET /functions/v1/podcast_get?episode_id=<uuid>
```

## Request

```bash
curl "https://your-project.supabase.co/functions/v1/podcast_get?episode_id=EPISODE_ID" \
  -H "Authorization: Bearer JWT_TOKEN"
```

## Response

```typescript
{
  episode: {
    id: string,
    lesson_id: string,
    title: string,
    status: "queued" | "scripting" | "voicing" | "ready" | "failed",
    language: string,
    voice_a_id: string,
    voice_b_id: string,
    total_segments: number
  },
  segments: [
    {
      seq: number,
      speaker: "a" | "b",
      text: string,
      tts_status: "queued" | "generating" | "ready" | "failed",
      audio_bucket: string | null,
      audio_path: string | null,
      duration_ms: number | null
    }
  ]
}
```

## Frontend Usage

```typescript
import { supabase } from '@/lib/supabase';

// Fetch episode
const { data } = await supabase.functions.invoke('podcast_get', {
  method: 'GET',
  params: { episode_id: 'uuid' },
});

console.log(data.episode.title);
console.log(`${data.segments.length} segments`);
```

## Player Integration

```typescript
class PodcastPlayer {
  async loadEpisode(episodeId: string) {
    const { data } = await supabase.functions.invoke('podcast_get', {
      method: 'GET',
      params: { episode_id: episodeId },
    });
    
    this.episode = data.episode;
    this.segments = data.segments;
    
    // Check if all audio is ready
    const allReady = this.segments.every(s => s.tts_status === 'ready');
    
    return { episode: data.episode, canPlay: allReady };
  }
  
  getAudioUrl(segment: any) {
    if (!segment.audio_path) return null;
    
    return `${SUPABASE_URL}/storage/v1/object/public/${segment.audio_bucket}/${segment.audio_path}`;
  }
}
```

## Testing

```bash
# Run test suite
cd supabase/functions/podcast_get
JWT=$(../../get-jwt.sh user1@test.com password123 | grep "export JWT" | cut -d "'" -f2)
./test.sh "$JWT"
```

## Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 400 | Missing required parameter | No episode_id provided |
| 400 | Invalid episode_id format | Not a valid UUID |
| 401 | Missing authorization header | No JWT token |
| 401 | Invalid or expired session | JWT validation failed |
| 404 | Episode not found or access denied | Episode doesn't exist or not owned by user |
| 500 | Internal server error | Database error |

## Deployment

```bash
supabase functions deploy podcast_get --no-verify-jwt
```

## Files

```
supabase/functions/podcast_get/
├── index.ts              # Main function
├── deno.json             # Deno config
├── README.md             # Full documentation
├── QUICK_REFERENCE.md    # This file
└── test.sh               # Test script
```

---

**Status:** ✅ Deployed and tested  
**Version:** 1  
**Auth:** JWT required, RLS enforced
