#!/bin/bash

# Start script for Interactive Pages MVP

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Copy env.example to .env and fill in your API keys."
    echo "   cp env.example .env"
fi

# Start server
echo "Starting server on port 5002..."
python api/server.py
