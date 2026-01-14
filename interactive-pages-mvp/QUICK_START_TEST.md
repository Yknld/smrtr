# 🚀 Quick Start - Test Interactive Pages

## Step 1: Start the Server

```bash
cd interactive-pages-mvp
./test_local.sh
```

Wait until you see:
```
✅ Starting server on http://localhost:5002
```

## Step 2: Open Test UI

Open your browser and go to:
```
http://localhost:5002/test
```

Or run:
```bash
open http://localhost:5002/test
```

## Step 3: Generate an Interactive Page

1. **Enter a lesson ID** (default: `lesson_1`)
2. **Click "Generate Interactive Page"**
3. **Watch the status updates:**
   - Queued
   - Fetching lesson data
   - Generating spec with Gemini
   - Building HTML with OpenHands
   - Validating HTML
   - Publishing to GitHub
   - ✅ Done!

4. **Click "Open Interactive Page"** when it's ready!

## What You'll See

### Test UI
- Clean interface with gradient background
- Input field for lesson ID
- Generate button
- Real-time status updates with spinner
- Link to open the generated page

### Generated Interactive Page
- Progress bar at the top
- Step indicator (Step 1/5, etc.)
- 2-4 interactive scenes with:
  - Teaching points
  - Interactive elements
- Mini-game section
- Quiz with 4 questions
- Reset button
- Completion screen

## Troubleshooting

**Server not starting?**
- Make sure you're in the `interactive-pages-mvp` directory
- Check if port 5002 is already in use

**Page not loading?**
- Make sure the server is running
- Check browser console for errors
- Try refreshing the page

**Generation fails?**
- Check server logs in the terminal
- Make sure TEST_MODE is enabled (should see "🧪 TEST MODE ENABLED")
- Try a different lesson_id

## Next Steps

Once you've tested with the mock services, you can:
1. Set up real API keys (Gemini, RunPod, GitHub)
2. Connect to your actual lesson database
3. Integrate into your main app

Enjoy testing! 🎉
