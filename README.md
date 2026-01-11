# smrtr
smrtr study integrated into daily life.

## Smartr Web App

A React web app workspace layout shell with sidebar, main content area, and optional inspector panel.

## File Structure

### Project Configuration
- `package.json` - Dependencies and scripts
- `vite.config.js` - Vite configuration
- `index.html` - HTML entry point
- `.gitignore` - Git ignore rules

### Design Tokens
- `design-tokens.json` - Design token definitions
- `design-tokens-usage.md` - Token usage documentation

### Source Files

#### Entry Point
- `src/main.jsx` - React app entry point
- `src/index.css` - Global styles and design tokens as CSS variables
- `src/App.jsx` - Main app component with routing
- `src/App.css` - App-specific styles

#### Layout Components
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

#### Screen Components (Placeholders)
- `src/screens/Home.jsx` - Home screen (Choose Class) - placeholder
- `src/screens/ClassNotes.jsx` - Class Notes screen - placeholder
- `src/screens/StudyHub.jsx` - Study Hub screen - placeholder
- `src/screens/Screen.css` - Screen transition animations

### Documentation
- `UX_SPEC.md` - UX specification document
- `README.md` - This file

## How to Run

### Prerequisites
- Node.js 16+ (or higher) installed
- npm (comes with Node.js) or yarn/pnpm

### Installation

1. **Install dependencies:**
```bash
npm install
```

This will install:
- React 18.2.0
- React DOM 18.2.0
- React Router DOM 6.20.0
- Vite 5.0.8 (build tool)
- React plugin for Vite

### Development

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
The terminal will display a local URL, typically:
```
➜  Local:   http://localhost:5173/
```
Open this URL in your browser to view the app.

The development server includes:
- Hot module replacement (HMR) - changes appear instantly
- Fast refresh for React components
- Source maps for debugging

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

This serves the production build locally so you can test it before deploying.

## Features Implemented

✅ **Left Sidebar**
- Fixed width (256px) with collapsible functionality
- Smooth transition animations
- Navigation menu with active states
- Logo/branding area
- User profile area

✅ **Main Content Area**
- Responsive layout
- Top bar with page title
- Scrollable content area

✅ **Right Inspector Panel**
- Collapsible (320px when open)
- OFF by default
- Floating toggle button when closed
- Smooth slide-in animation

✅ **Design Tokens**
- All design tokens from `design-tokens.json` applied as CSS variables
- Consistent spacing, colors, typography, shadows, and radii

✅ **Page Transitions**
- Subtle fade + slide animation between routes
- Uses motion tokens (duration: normal, easing: ease-out, distance: fade)

✅ **Routing**
- React Router v6 setup
- Routes configured for all 3 screens:
  - `/` - Home (Choose Class)
  - `/classes/:classId` - Class Notes
  - `/classes/:classId/notes/:noteId` - Study Hub

## Design System

All design tokens are applied through CSS variables defined in `src/index.css`. The app uses:
- Warm gray background (#FAFAF9) - not pure white
- Rounded surfaces (12px card radius)
- Subtle shadows
- Soft borders
- Primary accent color (#4F46E5)

## Next Steps

This is a shell layout only - screen content should be added to:
- `src/screens/Home.jsx`
- `src/screens/ClassNotes.jsx`
- `src/screens/StudyHub.jsx`
