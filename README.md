# Educational Motion Graphics Project

Premium educational motion graphics with calm classroom pacing and modern flat/vector aesthetic.

**Now with Veo API integration for high-quality video generation!** 🎬

## Style Guide

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for complete design specifications.

## Quick Reference

- **Background**: Neutral grey with subtle gradient
- **Style**: Modern flat/vector, minimal clutter
- **Pacing**: Calm classroom (not cinematic, not TikTok)
- **Restrictions**: No emojis, logos, brands, watermarks, or baked-in text

## Project Structure

```
videoAnimation/
├── assets/          # Source assets, graphics, images
├── exports/         # Final rendered outputs
├── compositions/    # Animation compositions/projects
└── scripts/         # Automation and helper scripts
```

## Veo API Integration

The system now supports Google Veo API for high-quality video generation with audio!

- **Automatic Detection**: Uses Veo if API key is set, falls back to local generation
- **High Quality**: Professional animations, audio narration, smooth camera movements
- **Easy Setup**: Just set `VEO_API_KEY` environment variable

See [README_VEO.md](./README_VEO.md) for detailed setup instructions.

## Workflow

1. **Input**: Provide lecture content/notes
2. **Storyboard**: System generates scene-by-scene plan
3. **Veo Jobs**: Converts to Veo API specifications
4. **Generation**: 
   - **With Veo**: High-quality videos with audio (if API key set)
   - **Without Veo**: Local generation with basic animations
5. **Output**: Final educational video ready to use

## Quick Start

```bash
# Set Veo API key (optional - works without it too!)
export VEO_API_KEY="your_key_here"

# Start the web app
./start.sh

# Open browser to http://localhost:5001
```

## Testing Veo

```bash
python3 test_veo.py
```
