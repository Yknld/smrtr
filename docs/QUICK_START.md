# Quick Start Guide

## ✅ Fixed Issues

1. **Virtual Environment**: Automatically created and activated
2. **Port Conflict**: Changed from 5000 to 5001 (avoids macOS AirPlay Receiver)
3. **Dependencies**: Flask and Pillow installed and working

## 🚀 Run the App

**Just run this command:**
```bash
./start.sh
```

**Then open your browser to:**
```
http://localhost:5001
```

## 📝 What to Do

1. The form is pre-filled with DualArrayDeque example content
2. Click **"Generate Video Storyboard"** button
3. You'll see:
   - ✅ All scenes with narration text
   - ✅ Scene durations
   - ✅ Visual types (diagram/chart/illustration)
   - ✅ Camera motion hints

## 🔧 Troubleshooting

If port 5001 is still in use:
```bash
# Kill any process on port 5001
lsof -ti:5001 | xargs kill -9

# Then run again
./start.sh
```

If you see module errors:
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

## ✨ Status

- ✅ Virtual environment: Working
- ✅ Flask: Installed
- ✅ Pillow: Installed  
- ✅ Port: 5001 (no conflicts)
- ⚠️  MoviePy: Optional (app works without it)

## 🎬 Next Steps

Once you can see the storyboard:
- Try entering your own lecture content
- See how scenes are automatically generated
- Use the Veo job specs for actual video generation (when you have API access)
