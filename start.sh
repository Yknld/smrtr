#!/bin/bash
# Simple startup script for SmartrVideo web app

echo "🎓 Starting SmartrVideo Generator..."
echo ""

# Check if virtual environment exists (try both venv and .venv)
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    VENV_DIR="venv"
elif [ -d ".venv" ]; then
    VENV_DIR=".venv"
else
    VENV_DIR="venv"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment ($VENV_DIR)..."
source $VENV_DIR/bin/activate

# Check if Flask is installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "⚠️  Flask not found. Installing dependencies..."
    pip install Flask Pillow imageio
fi

# Try to install moviepy (optional - video generation will work without it)
if ! python3 -c "import moviepy" 2>/dev/null; then
    echo "📹 MoviePy not found. Video generation will use simple placeholders."
    echo "   (You can install moviepy later if needed: pip install moviepy)"
    echo ""
fi

echo "🚀 Starting web server..."
echo "   Open your browser to: http://localhost:5001"
echo "   Press Ctrl+C to stop"
echo ""

# Kill any existing process on port 5001
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

python3 app.py
