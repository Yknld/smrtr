#!/bin/bash
# Quick test script for Interactive Pages MVP (no API keys needed)

cd "$(dirname "$0")"

echo "🧪 Starting Interactive Pages MVP in TEST MODE..."
echo ""

# Set test mode
export TEST_MODE=true
export PORT=5002

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
fi

echo "✅ Starting server on http://localhost:5002"
echo "   Press Ctrl+C to stop"
echo ""
echo "Test with:"
echo "  curl -X POST http://localhost:5002/interactive/generate -H 'Content-Type: application/json' -d '{\"lesson_id\": \"lesson_1\"}'"
echo ""

# Start server
python api/server.py
