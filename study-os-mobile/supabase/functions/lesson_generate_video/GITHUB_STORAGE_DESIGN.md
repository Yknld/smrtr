# Video Generation via GitHub Storage

## Problem with Current Approach

1. **Long polling is unreliable** - Edge functions time out
2. **No visibility** - Can't see generation progress
3. **Background processing fails** - Function may restart
4. **No artifacts inspection** - Hard to debug OpenHand outputs

## New Architecture: GitHub as Intermediate Storage

### Flow

```
1. Edge Function
   → Calls OpenHand API with GitHub instructions
   → Returns immediately
   → OpenHand generates video in background

2. OpenHand (via prompt)
   → Generates video with Remotion
   → Pushes video to GitHub repo
   → Commits with specific naming convention

3. Polling Service (separate edge function)
   → Watches GitHub repo for new videos
   → Downloads video when found
   → Uploads to Supabase storage
   → Updates database record

4. Mobile App
   → Subscribes to database changes via Realtime
   → Shows "Generated" when storage_path is populated
```

### Benefits

- ✅ **Reliable**: GitHub stores videos permanently
- ✅ **Visible**: Can see video in GitHub before download
- ✅ **Debuggable**: Can manually inspect/download videos
- ✅ **Scalable**: Handles multiple simultaneous generations
- ✅ **Resilient**: Retries if download fails

## Implementation

### 1. GitHub Repository Setup

Create a dedicated repo for video artifacts:
```
smrtr-video-artifacts/
  └── videos/
      ├── {lesson_id}_{video_id}.mp4
      ├── {lesson_id}_{video_id}.json (metadata)
      └── README.md
```

### 2. Update Remotion Prompt

Add GitHub upload instructions:
```
FINAL STEP (CRITICAL):
After rendering video successfully:

1. Install GitHub CLI if not present:
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh -y

2. Authenticate with token:
   echo $GITHUB_TOKEN | gh auth login --with-token

3. Clone repo (or use existing):
   gh repo clone smrtr-ai/video-artifacts || true
   cd video-artifacts

4. Copy video:
   cp /workspace/out/video.mp4 ./videos/${LESSON_ID}_${VIDEO_ID}.mp4

5. Create metadata:
   cat > ./videos/${LESSON_ID}_${VIDEO_ID}.json << EOF
   {
     "lesson_id": "${LESSON_ID}",
     "video_id": "${VIDEO_ID}",
     "generated_at": "$(date -Iseconds)",
     "duration_sec": 30,
     "format": "mp4",
     "resolution": "1280x720",
     "conversation_id": "${CONVERSATION_ID}"
   }
   EOF

6. Commit and push:
   git add videos/${LESSON_ID}_${VIDEO_ID}.*
   git commit -m "Add video for lesson ${LESSON_ID}"
   git push

7. Print confirmation:
   echo "✓ Video uploaded to GitHub"
   echo "Video ID: ${VIDEO_ID}"
   echo "Path: videos/${LESSON_ID}_${VIDEO_ID}.mp4"
```

### 3. New Edge Function: `video_poll_github`

Creates a polling service that checks GitHub for videos.

```typescript
// supabase/functions/video_poll_github/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

serve(async (req: Request) => {
  // Get all videos in "generating" state
  const { data: videos } = await supabase
    .from('lesson_assets')
    .select('id, lesson_id, user_id, created_at')
    .eq('kind', 'video')
    .is('storage_path', null)
    .order('created_at', { ascending: false });

  for (const video of videos) {
    // Check GitHub for video file
    const githubUrl = `https://raw.githubusercontent.com/smrtr-ai/video-artifacts/main/videos/${video.lesson_id}_${video.id}.mp4`;
    
    try {
      const response = await fetch(githubUrl);
      
      if (response.ok) {
        console.log(`Found video on GitHub: ${video.id}`);
        
        // Download video
        const videoBlob = await response.arrayBuffer();
        
        // Upload to Supabase storage
        const storagePath = `${video.user_id}/${video.lesson_id}/${video.id}.mp4`;
        await supabase.storage
          .from('lesson-assets')
          .upload(storagePath, videoBlob, {
            contentType: 'video/mp4',
            upsert: true,
          });
        
        // Update database
        await supabase
          .from('lesson_assets')
          .update({
            storage_path: storagePath,
            mime_type: 'video/mp4',
          })
          .eq('id', video.id);
        
        console.log(`✓ Video ${video.id} uploaded to storage`);
      }
    } catch (error) {
      console.log(`Video not ready yet: ${video.id}`);
    }
  }
  
  return new Response(JSON.stringify({ checked: videos.length }));
});
```

### 4. Cron Job to Poll GitHub

Use Supabase cron or external service:

```sql
-- Using pg_cron
SELECT cron.schedule(
  'poll-github-videos',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/video_poll_github',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  );
  $$
);
```

Or use GitHub Actions:

```yaml
# .github/workflows/poll-videos.yml
name: Poll Videos
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
  workflow_dispatch:

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Call polling endpoint
        run: |
          curl -X POST \
            "https://your-project.supabase.co/functions/v1/video_poll_github" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### 5. Update Original Edge Function

Simplify to just start OpenHand, don't poll:

```typescript
// lesson_generate_video/index.ts

// After starting OpenHand conversation:
const conversationId = await startOpenHandConversation(
  remotionPrompt,
  openhandApiKey,
  requestId
);

// Create video record (no polling needed)
const { error: insertError } = await supabaseAdmin
  .from("lesson_assets")
  .insert({
    id: videoId,
    lesson_id: lesson_id,
    user_id: user.id,
    kind: "video",
    storage_bucket: "lesson-assets",
    storage_path: null, // Will be set by polling service
    mime_type: "video/mp4",
  });

// Return immediately
return new Response(JSON.stringify({
  lesson_id,
  video_id: videoId,
  status: "generating",
  conversation_id: conversationId,
  github_path: `videos/${lesson_id}_${videoId}.mp4`,
}));
```

## Alternative: Simpler Webhook Approach

Instead of polling GitHub, use webhook:

```
OpenHand finishes
  → Calls webhook URL
  → Webhook triggers edge function
  → Downloads from GitHub
  → Uploads to Supabase
```

## Which Approach?

### Option A: GitHub + Polling (Recommended)
- Most reliable
- Can manually inspect videos
- Easy to debug
- Works even if webhook fails

### Option B: GitHub + Webhook
- Faster (no polling delay)
- More complex setup
- Single point of failure

### Option C: Improve Current Polling
- Keep existing architecture
- Add better timeout handling
- Use pg_net for background jobs
- Simpler, but less reliable

## Next Steps

1. Create `smrtr-ai/video-artifacts` GitHub repo
2. Generate GitHub token with repo access
3. Add token to edge function secrets
4. Update Remotion prompt with GitHub upload
5. Create `video_poll_github` edge function
6. Set up cron job to poll every 5 minutes
7. Test end-to-end flow

## Estimated Time

- Setup: 30 minutes
- Testing: 15 minutes
- Total: 45 minutes

Ready to implement?
