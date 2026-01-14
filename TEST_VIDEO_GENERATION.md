# 🎬 Test Video Animation Generation

## Quick Start - Generate Animated Videos from Lecture Notes

You already have a complete video generation system! Here's how to use it:

### Step 1: Start the Video Generator Server

```bash
cd /Users/ahmedelsharif/Desktop/cursor/videoAnimation
./start.sh
```

Or manually:
```bash
source venv/bin/activate
python app.py
```

The server will start on: **http://localhost:5001**

### Step 2: Open the Web Interface

Open your browser to:
```
http://localhost:5001
```

### Step 3: Generate a Video

1. **Enter your lecture content:**
   - Video Title: e.g., "Introduction to Data Structures"
   - Topic: e.g., "Computer Science"
   - Audience Level: High School or College
   - Summary Notes: Paste your lecture notes here
   - Transcript (optional): Any transcript excerpts

2. **Click "Generate Video"**

3. **Wait for generation:**
   - Storyboard generation
   - Veo job creation
   - Video generation (Veo API or local fallback)
   - Audio synthesis

4. **Watch your video!**
   - The video will appear below
   - Download or share it

## What Happens Behind the Scenes

1. **Storyboard Generation** (`scripts/smartr_video_planner.py`)
   - Converts lecture notes into a structured storyboard
   - 8-12 scenes, 5-12 seconds each
   - On-screen text, narration, visual types

2. **Veo Job Creation** (`scripts/smartr_veo_director.py`)
   - Creates Veo API job specs
   - Visual prompts, audio prompts, negative prompts

3. **Video Generation**
   - Tries Veo API first (if configured)
   - Falls back to local generation if Veo unavailable
   - Creates animated scenes with diagrams/illustrations
   - Adds narration audio (TTS)

4. **Output**
   - MP4 video file
   - Saved to `exports/` directory
   - Playable in browser or downloaded

## Example Input

**Summary Notes:**
```
2.5 DualArrayDeque: Building a Deque from Two Stacks

A DualArrayDeque represents a list using two ArrayStacks. The front ArrayStack stores elements in reverse order, while the back ArrayStack stores them normally. This allows fast operations at either end.

Operations:
- get(i) and set(i,x): O(1) time
- add(i,x): O(1) amortized time
- remove(i): O(1) amortized time

The balance() method ensures front.size() and back.size() don't differ by more than a factor of 3.
```

**Result:**
- Short animated video (60-120 seconds)
- Clear visualizations of the data structure
- Step-by-step explanations
- Professional narration

## Troubleshooting

**Server won't start?**
```bash
# Check if port 5001 is in use
lsof -ti:5001 | xargs kill -9

# Try again
./start.sh
```

**No video generated?**
- Check browser console for errors
- Check server logs in terminal
- Make sure dependencies are installed: `pip install -r requirements.txt`

**Veo API not working?**
- The system will automatically fall back to local generation
- Local generation uses diagrams and TTS narration
- Still produces good educational videos!

## Files Generated

- **Video files**: `exports/video_*.mp4`
- **Storyboard JSON**: Temporary files (auto-deleted)
- **Veo jobs JSON**: Temporary files (auto-deleted)

## Next Steps

1. Test with different lecture topics
2. Adjust video style (in `STYLE_GUIDE.md`)
3. Configure Veo API (if you have access)
4. Customize narration style (TTS settings)

Enjoy generating educational videos! 🎓🎬
