# smrtr

smrtr study integrated into daily life.

## Educational Motion Graphics Video Generator

Premium educational motion graphics with calm classroom pacing and modern flat/vector aesthetic.

**Now with Veo API integration for high-quality video generation!** 🎬

### Style Guide

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for complete design specifications.

### Quick Reference

- **Background**: Neutral grey with subtle gradient
- **Style**: Modern flat/vector, minimal clutter
- **Pacing**: Calm classroom (not cinematic, not TikTok)
- **Restrictions**: No emojis, logos, brands, watermarks, or baked-in text

### Project Structure

```
videoAnimation/
├── assets/          # Source assets, graphics, images
├── exports/         # Final rendered outputs
├── compositions/    # Animation compositions/projects
└── scripts/         # Automation and helper scripts
```

### Veo API Integration

The system now supports Google Veo API for high-quality video generation with audio!

- **Automatic Detection**: Uses Veo if API key is set, falls back to local generation
- **High Quality**: Professional animations, audio narration, smooth camera movements
- **Easy Setup**: Just set `VEO_API_KEY` environment variable

See [README_VEO.md](./README_VEO.md) for detailed setup instructions.

### Workflow

1. **Input**: Provide lecture content/notes
2. **Storyboard**: System generates scene-by-scene plan
3. **Veo Jobs**: Converts to Veo API specifications
4. **Generation**: 
   - **With Veo**: High-quality videos with audio (if API key set)
   - **Without Veo**: Local generation with basic animations
5. **Output**: Final educational video ready to use

### Quick Start

```bash
# Set Veo API key (optional - works without it too!)
export VEO_API_KEY="your_key_here"

# Start the web app
./start.sh

# Open browser to http://localhost:5001
```

### Testing Veo

```bash
python3 test_veo.py
```

---

## Smartr Web App

A React web app workspace layout shell with sidebar, main content area, and optional inspector panel.

### File Structure

#### Project Configuration
- `package.json` - Dependencies and scripts
- `vite.config.js` - Vite configuration
- `index.html` - HTML entry point
- `.gitignore` - Git ignore rules

#### Design Tokens
- `design-tokens.json` - Design token definitions
- `design-tokens-usage.md` - Token usage documentation

#### Source Files

**Entry Point**
- `src/main.jsx` - React app entry point
- `src/index.css` - Global styles and design tokens as CSS variables
- `src/App.jsx` - Main app component with routing
- `src/App.css` - App-specific styles

**Layout Components**
- `src/components/Layout/Layout.jsx` - Main layout container
- `src/components/Layout/Layout.css` - Layout styles
- `src/components/Layout/Sidebar.jsx` - Left sidebar component (collapsible)
- `src/components/Layout/Sidebar.css` - Sidebar styles
- `src/components/Layout/MainContent.jsx` - Main content wrapper
- `src/components/Layout/MainContent.css` - Main content styles
- `src/components/Layout/TopBar.jsx` - Top bar with page title
- `src/components/Layout/TopBar.css` - Top bar styles
- `src/components/Layout/InspectorPanel.jsx` - Right inspector panel (collapsible, off by default)
- `src/components/Layout/InspectorPanel.css` - Inspector panel styles

**Screen Components**
- `src/screens/Home.jsx` - Home screen (Choose Class)
- `src/screens/ClassNotes.jsx` - Class Notes screen
- `src/screens/StudyHub.jsx` - Study Hub screen
- `src/screens/Screen.css` - Screen transition animations

### How to Run

#### Prerequisites
- Node.js 16+ (or higher) installed
- npm (comes with Node.js) or yarn/pnpm

#### Installation

1. **Install dependencies:**
```bash
npm install
```

#### Development

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
The terminal will display a local URL, typically:
```
➜  Local:   http://localhost:5173/
```

#### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Features Implemented

✅ **Left Sidebar** - Fixed width (256px) with collapsible functionality
✅ **Main Content Area** - Responsive layout with top bar
✅ **Right Inspector Panel** - Collapsible (320px when open), OFF by default
✅ **Design Tokens** - All design tokens applied as CSS variables
✅ **Page Transitions** - Subtle fade + slide animation between routes
✅ **Routing** - React Router v6 setup
