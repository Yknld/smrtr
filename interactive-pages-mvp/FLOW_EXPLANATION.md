# Interactive Pages Flow Explanation

## Current Implementation (What We Built)

The MVP we just created follows this exact flow:

```
User → POST /interactive/generate
  ↓
Backend fetches lesson data (by lesson_id)
  ↓
Gemini 3 → Generates JSON spec (prompts/gemini_spec.txt)
  ↓
OpenHands (RunPod) → Generates HTML (prompts/openhands_html.txt)
  ↓
Validate HTML (security + size checks)
  ↓
Publish to GitHub (Pages repo or Gist)
  ↓
Return preview_url + source_url
```

## What's Working

✅ **Backend API** - Flask server with exact routes you specified  
✅ **Gemini Integration** - Generates JSON spec from lesson content  
✅ **OpenHands Integration** - Ready for RunPod endpoint  
✅ **GitHub Publishing** - Pages repo or Gist  
✅ **HTML Validation** - Security checks, size limits  
✅ **Test Mode** - Mock services for testing without API keys  

## Current Flow Details

### 1. User Action
```javascript
// In your app
fetch('/interactive/generate', {
  method: 'POST',
  body: JSON.stringify({ lesson_id: "lesson_123" })
})
```

### 2. Backend Processing
- Fetches lesson (title, summary, transcript)
- Gemini generates spec (2-4 scenes, mini-game, quiz)
- OpenHands generates HTML from spec
- Validates HTML
- Publishes to GitHub
- Returns URLs

### 3. User Views Result
```javascript
// Get status
const status = await fetch(`/interactive/status/${generation_id}`)
const { preview_url } = await status.json()

// Open in browser (or embed iframe)
window.open(preview_url)
```

## Caveats & Hard Parts

### 1. **OpenHands on RunPod**
- **Hard part**: Setting up OpenHands server on RunPod
- **Caveat**: Need to ensure OpenHands endpoint accepts the prompt format we're sending
- **Solution**: We've structured the prompt template to be clear and explicit

### 2. **GitHub Pages Setup**
- **Hard part**: GitHub Pages must be enabled on the repo
- **Caveat**: Pages URLs take a few minutes to update after publishing
- **Solution**: We support Gist fallback (instant, but less organized)

### 3. **HTML Validation**
- **Hard part**: Ensuring OpenHands generates compliant HTML
- **Caveat**: OpenHands might generate code that fails validation
- **Solution**: Clear prompt constraints + validation with helpful errors

### 4. **State Management**
- **Hard part**: Tracking generation status across requests
- **Caveat**: In-memory storage (MVP) - lost on server restart
- **Solution**: For production, use database (Supabase/Postgres)

### 5. **Error Handling**
- **Hard part**: OpenHands might fail or timeout
- **Caveat**: No retry logic yet
- **Solution**: Add retry with exponential backoff for production

### 6. **Rate Limiting**
- **Hard part**: Preventing abuse
- **Caveat**: Current rate limiter is in-memory
- **Solution**: Use Redis or database-backed rate limiting

## Integration Points

### In Your App (Frontend)

```javascript
// When user clicks "Interact" button
async function generateInteractivePage(lessonId) {
  // 1. Start generation
  const response = await fetch('/interactive/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson_id: lessonId })
  });
  
  const { generation_id } = await response.json();
  
  // 2. Poll for completion
  const pollStatus = async () => {
    const status = await fetch(`/interactive/status/${generation_id}`);
    const data = await status.json();
    
    if (data.status === 'done') {
      // 3. Open or embed the page
      window.open(data.preview_url, '_blank');
      // OR embed in iframe:
      // document.getElementById('iframe').src = data.preview_url;
    } else if (data.status === 'failed') {
      alert('Generation failed: ' + data.error);
    } else {
      // Still processing, poll again
      setTimeout(pollStatus, 2000);
    }
  };
  
  pollStatus();
}
```

## What's Missing (For Production)

1. **Database Integration** - Replace mock `lesson_service` with real DB
2. **Proper Job Queue** - Use Celery/RQ instead of threads
3. **Error Retries** - Retry failed OpenHands calls
4. **Caching** - Cache Gemini specs for same lesson
5. **Webhook Support** - Notify frontend when done (instead of polling)
6. **User Authentication** - Track which user generated what

## Next Steps

1. **Set up RunPod OpenHands endpoint**
   - Deploy OpenHands model on RunPod
   - Get endpoint URL
   - Test with our prompt format

2. **Configure GitHub**
   - Create Pages repo (or use existing)
   - Enable GitHub Pages
   - Set `GITHUB_PAGES_REPO` env var

3. **Connect to Your App**
   - Add "Interact" button to lesson UI
   - Call `/interactive/generate` endpoint
   - Show loading state while polling
   - Open preview URL when done

4. **Replace Mock Services**
   - Connect to real lesson database
   - Use real Gemini API key
   - Use real RunPod endpoint
   - Use real GitHub publishing

## Testing

Right now you can test everything with `TEST_MODE=true`:
- Mock Gemini (returns sample spec)
- Mock OpenHands (generates HTML)
- Mock GitHub (saves locally)

This lets you test the full flow without spending money on APIs!
