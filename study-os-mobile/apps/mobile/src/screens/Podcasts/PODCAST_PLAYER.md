# Podcast Player Screen

## Overview

The Podcast Player provides an audio playback interface for AI-generated lesson podcasts. It features a clean, modern design inspired by popular podcast players, with an added interactive "Join in Mic" feature for real-time Q&A.

## Features

### Core Playback
- **Play/Pause**: Large central button for primary playback control
- **Skip Controls**: 10-second skip forward/backward buttons
- **Progress Bar**: Visual progress indicator with current time and duration
- **Playback Speed**: Adjustable speed (1x, 1.25x, 1.5x, 1.75x, 2x)

### Engagement
- **Like/Dislike**: Feedback buttons to improve content generation
- **Download**: Save podcasts for offline listening

### Interactive Features
- **Join in Mic**: Users can join a live session to ask questions and interact
  - Button changes state when active (filled background, different text)
  - When active, users are connected to a live session with mic access
  - Enables real-time Q&A during podcast playback

## UI Design

### Header
- Close button (left)
- Lesson title (center, truncated)
- Download button (right)

### Content Area
- Album art / visualization placeholder
- Displays podcast artwork or waveform visualization

### Join in Mic Button
- **Inactive State**:
  - Text: "Join in & ask questions"
  - Outlined button with icon
  - Subtle background
  
- **Active State**:
  - Text: "Live - Tap to leave"
  - Filled button with primary color
  - Solid microphone icon

### Engagement Row
- Playback speed control (left)
- Like/dislike buttons (right)

### Playback Controls
- 10s skip back (left)
- Play/pause (center, large)
- 10s skip forward (right)
- All controls have subtle animations on press

## Navigation

### Entry Points
1. **From Lesson Hub**: Tap "Podcast" action tile
2. **From Podcasts Tab**: Tap a podcast card

### Route Parameters
```typescript
{
  lessonId: string;      // Lesson identifier
  lessonTitle: string;   // Display title
  podcastUrl?: string;   // Audio file URL (optional)
}
```

## Integration Points

### TODO: Backend Integration
1. **Audio Playback**:
   - Integrate with React Native audio library (e.g., expo-av)
   - Load podcast URL from Supabase Storage
   - Handle playback state and progress

2. **Live Session**:
   - Connect to WebSocket for live Q&A
   - Integrate with microphone permissions
   - Handle real-time audio/text communication

3. **Progress Tracking**:
   - Save playback position to `study_sessions` table
   - Resume from last position on return
   - Track completion for analytics

4. **Engagement Data**:
   - Save like/dislike feedback
   - Track playback speed preferences
   - Log skip patterns for content improvement

## Database Schema

Uses existing tables:
- `lesson_assets`: Stores podcast audio files
- `study_sessions`: Tracks listening sessions (mode: 'listen')
- Future: Add podcast-specific metadata table

## File Structure

```
src/screens/Podcasts/
├── PodcastsScreen.tsx          # List of available podcasts
├── PodcastPlayerScreen.tsx     # Individual podcast player
└── PODCAST_PLAYER.md           # This documentation
```

## Design Principles

Following app design guidelines:
- ✅ Minimal, clean interface
- ✅ Subtle elevation (not heavy shadows)
- ✅ Muted color palette
- ✅ Clear typography hierarchy
- ✅ Touch-friendly controls
- ✅ Smooth animations

No use of:
- ❌ Centered hero empty states
- ❌ Full-width CTAs
- ❌ Saturated accent colors
- ❌ Heavy shadows
- ❌ Gradients
- ❌ Marketing copy

## Future Enhancements

1. **Visualization**: Add audio waveform or animated visualizer
2. **Chapters**: Support podcast chapters/timestamps
3. **Transcript**: Show synchronized transcript while playing
4. **Sleep Timer**: Auto-stop after duration
5. **Speed Presets**: Save preferred playback speeds
6. **Queue Management**: Play multiple podcasts in sequence
7. **Collaborative Sessions**: Multiple users in same live session
8. **Question History**: View past Q&A from live sessions
