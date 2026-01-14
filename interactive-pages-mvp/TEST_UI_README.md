# Test UI for Interactive Pages

## Quick Start

1. **Start the server** (if not already running):
   ```bash
   cd interactive-pages-mvp
   ./test_local.sh
   ```

2. **Open the test UI in your browser**:
   ```
   http://localhost:5002/test
   ```

3. **Generate an interactive page**:
   - Enter a lesson ID (default: `lesson_1`)
   - Click "Generate Interactive Page"
   - Wait for generation to complete
   - Click "Open Interactive Page" when done

## What You'll See

### Test UI Page
- Clean, modern interface
- Input field for lesson ID
- "Generate Interactive Page" button
- Real-time status updates
- Link to open the generated page

### Generated Interactive Page
- Progress bar
- 2-4 interactive scenes with teaching points
- Mini-game section
- Quiz with 4 multiple choice questions
- Reset button
- Completion screen

## Features

- ✅ Real-time status polling
- ✅ Loading indicators
- ✅ Error handling
- ✅ Direct link to generated page
- ✅ Works with TEST_MODE (no API keys needed)

## Testing Flow

1. Server starts on port 5002
2. Open `http://localhost:5002/test`
3. Click "Generate Interactive Page"
4. Watch status updates:
   - Queued
   - Fetching lesson data
   - Generating spec with Gemini
   - Building HTML with OpenHands
   - Validating HTML
   - Publishing to GitHub
   - Done!
5. Click "Open Interactive Page" to view the result

## Troubleshooting

**Server not running?**
```bash
cd interactive-pages-mvp
./test_local.sh
```

**CORS errors?**
- Make sure the server is running on `localhost:5002`
- Check browser console for errors

**Generation fails?**
- Check server logs
- Make sure TEST_MODE is enabled (no API keys needed)
- Try a different lesson_id
