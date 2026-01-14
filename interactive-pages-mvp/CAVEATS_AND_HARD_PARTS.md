# Interactive Pages: Caveats & Hard Parts

## The Flow (What We Built)

```
User clicks "Interact" button in your app
  ↓
POST /interactive/generate { lesson_id: "123" }
  ↓
Backend: Fetch lesson data (title, summary, transcript)
  ↓
Gemini 3: Generate JSON spec (2-4 scenes, mini-game, quiz)
  ↓
OpenHands (RunPod): Generate interactive HTML from spec
  ↓
Validate HTML (security checks, size limits)
  ↓
Publish to GitHub Pages (or Gist)
  ↓
Return preview_url (e.g., https://yourusername.github.io/pages/abc123/index.html)
  ↓
User clicks link → Opens interactive page in browser
```

## ✅ What's Working Right Now

1. **Backend API** - Flask server with exact routes
2. **Gemini Integration** - Ready (just needs API key)
3. **OpenHands Integration** - Code ready (needs RunPod endpoint)
4. **GitHub Publishing** - Code ready (needs GitHub token + repo)
5. **HTML Validation** - Security checks implemented
6. **Test Mode** - Full pipeline works without API keys

## ⚠️ Caveats & Hard Parts

### 1. **OpenHands on RunPod Setup** (Hardest Part)

**The Challenge:**
- Need to deploy OpenHands model on RunPod
- OpenHands must accept our prompt format
- Response format must match what we expect

**What Could Go Wrong:**
- OpenHands might generate HTML that fails validation
- OpenHands might timeout on complex specs
- OpenHands might not follow our constraints (external scripts, etc.)

**Solutions:**
- ✅ We have a very explicit prompt template (`prompts/openhands_html.txt`)
- ✅ We validate HTML output (catches issues)
- ⚠️ May need to iterate on prompt based on OpenHands behavior
- ⚠️ Add retry logic for timeouts

**Action Items:**
1. Deploy OpenHands on RunPod
2. Test with our prompt format
3. Adjust prompt if needed
4. Add error handling for edge cases

---

### 2. **GitHub Pages Publishing**

**The Challenge:**
- GitHub Pages takes 1-5 minutes to update after publishing
- Need to enable Pages on the repo
- Need proper permissions (write access)

**What Could Go Wrong:**
- Pages might not update immediately (user sees 404)
- Repo might not have Pages enabled
- Rate limiting (60 requests/hour for unauthenticated)

**Solutions:**
- ✅ We support Gist fallback (instant, but less organized)
- ✅ We return both `preview_url` and `source_url`
- ⚠️ Add polling/status check for Pages availability
- ⚠️ Cache generation results (don't regenerate same lesson)

**Action Items:**
1. Create GitHub repo for Pages
2. Enable GitHub Pages in settings
3. Set `GITHUB_PAGES_REPO` env var
4. Test publishing flow

---

### 3. **HTML Validation & Security**

**The Challenge:**
- OpenHands might generate code that fails validation
- Need to ensure no external scripts, network calls, etc.
- Size limit (1.5 MB) might be exceeded

**What Could Go Wrong:**
- Validation fails → generation fails
- User sees error instead of page
- OpenHands generates non-compliant code

**Solutions:**
- ✅ Strict validation rules (matches JavaScript validator)
- ✅ Clear error messages
- ⚠️ May need to adjust OpenHands prompt if it keeps failing
- ⚠️ Add "validation warnings" vs "errors" (some things might be fixable)

**Action Items:**
1. Test with real OpenHands output
2. Adjust prompt if validation fails
3. Add better error messages

---

### 4. **State Management (Job Queue)**

**Current (MVP):**
- In-memory job storage
- Lost on server restart
- No persistence

**What Could Go Wrong:**
- Server restart → lose all job status
- Can't check status of old generations
- No history

**Solutions (For Production):**
- Use database (Supabase/Postgres) for job storage
- Store generation metadata
- Add job history/retry

**Action Items:**
1. ✅ MVP works for testing
2. ⚠️ Add database integration for production

---

### 5. **Error Handling & Retries**

**Current:**
- Basic error handling
- No retries
- Errors fail immediately

**What Could Go Wrong:**
- OpenHands timeout → generation fails
- GitHub API rate limit → generation fails
- Network issues → generation fails

**Solutions:**
- Add retry logic with exponential backoff
- Better error messages
- Partial failure handling (e.g., spec generated but HTML failed)

**Action Items:**
1. Add retry logic for OpenHands calls
2. Add retry logic for GitHub publishing
3. Better error messages

---

### 6. **Rate Limiting**

**Current:**
- In-memory rate limiter
- 10 requests per 60 seconds per user

**What Could Go Wrong:**
- Abuse (someone spamming requests)
- Legitimate users hitting limits
- Rate limiter resets on server restart

**Solutions:**
- Use Redis or database-backed rate limiting
- Per-user limits (if authenticated)
- Different limits for different endpoints

**Action Items:**
1. ✅ MVP works for testing
2. ⚠️ Add Redis/database rate limiting for production

---

### 7. **Integration with Your App**

**The Challenge:**
- Need to connect frontend to backend
- Need to handle async generation (polling)
- Need to show loading states

**What Could Go Wrong:**
- User clicks "Interact" → nothing happens (no feedback)
- User doesn't know when generation is done
- Link doesn't work (404 on GitHub Pages)

**Solutions:**
- ✅ Backend returns `generation_id` immediately
- ✅ Status endpoint for polling
- ⚠️ Frontend needs to poll status
- ⚠️ Show loading spinner
- ⚠️ Handle errors gracefully

**Frontend Integration Example:**
```javascript
async function generateInteractivePage(lessonId) {
  // Show loading
  setLoading(true);
  
  // Start generation
  const res = await fetch('/interactive/generate', {
    method: 'POST',
    body: JSON.stringify({ lesson_id: lessonId })
  });
  const { generation_id } = await res.json();
  
  // Poll for completion
  const pollInterval = setInterval(async () => {
    const status = await fetch(`/interactive/status/${generation_id}`);
    const data = await status.json();
    
    if (data.status === 'done') {
      clearInterval(pollInterval);
      setLoading(false);
      window.open(data.preview_url, '_blank');
    } else if (data.status === 'failed') {
      clearInterval(pollInterval);
      setLoading(false);
      alert('Generation failed: ' + data.error);
    }
  }, 2000);
}
```

---

## 🎯 Next Steps (Priority Order)

### Phase 1: Get It Working (MVP)
1. ✅ Backend API built
2. ⚠️ Set up RunPod OpenHands endpoint
3. ⚠️ Configure GitHub Pages repo
4. ⚠️ Test end-to-end with real APIs

### Phase 2: Make It Robust
1. Add retry logic
2. Better error handling
3. Database integration (job storage)
4. Caching (don't regenerate same lesson)

### Phase 3: Production Ready
1. Authentication/authorization
2. Rate limiting (Redis)
3. Monitoring/logging
4. Webhook support (instead of polling)

---

## 💰 Cost Considerations

**Current Costs (Per Generation):**
- Gemini 3 API: ~$0.01-0.05 per spec generation
- RunPod OpenHands: Depends on model/pricing
- GitHub API: Free (within limits)

**Optimization:**
- Cache Gemini specs (same lesson = reuse spec)
- Cache HTML (same spec = reuse HTML)
- Rate limiting to prevent abuse

---

## 🧪 Testing Strategy

**Right Now (TEST_MODE):**
- Mock services work perfectly
- Test full pipeline without spending money
- Generated HTML saved locally

**With Real APIs:**
- Start with small test lessons
- Monitor API costs
- Check HTML validation
- Test GitHub publishing

---

## 📝 Summary

**What's Hard:**
1. OpenHands setup and prompt tuning
2. GitHub Pages timing (1-5 min delay)
3. HTML validation edge cases

**What's Easy:**
1. Backend API (already built)
2. Gemini integration (just needs API key)
3. Frontend integration (standard polling)

**What Needs Work:**
1. Real OpenHands endpoint setup
2. Error handling/retries
3. Database integration (for production)

The MVP is **ready to test** with mock services. Once you have RunPod + GitHub set up, it should work end-to-end!
