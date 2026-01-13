# SmartrVideo Web Interface

Simple web interface to generate educational videos from lecture content.

## Quick Start

Just run the startup script (it handles everything automatically):

```bash
./start.sh
```

The script will:
1. ✅ Create a virtual environment (if needed)
2. ✅ Install all dependencies
3. ✅ Start the web server

Then open your browser to: **http://localhost:5001**

(Note: Uses port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000)

## Manual Setup (if needed)

If you prefer to set it up manually:

1. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the web app:
```bash
python3 app.py
```

## Usage

1. Fill in the form with your lecture content:
   - Video Title
   - Topic
   - Audience Level
   - Lecture Content / Summary Notes
   - Transcript Excerpt (optional)

2. Click "Generate Video Storyboard"

3. View the generated storyboard with all scenes

4. If moviepy is installed, a simple animated video will be generated automatically

## Features

- ✅ Simple web interface
- ✅ Generate storyboard from text
- ✅ View all scenes with narration
- ✅ Generate simple animated videos (if moviepy installed)
- ✅ Download/view generated videos

## Notes

- The video generator creates simple placeholder animations
- For production, integrate with actual image/video generation APIs (DALL-E, Veo, etc.)
- Videos are saved in the `exports/` directory
