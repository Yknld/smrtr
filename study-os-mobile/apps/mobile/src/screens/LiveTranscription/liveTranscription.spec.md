# Live Transcription Screen Spec

## Purpose
Real-time audio transcription using Gemini Live API with ephemeral tokens.

## UI Components

### Header
- **Title**: "Live Transcription"
- **Subtitle**: "Gemini Live API • Real-time"

### Status Bar
- **Status Badge**: Shows connection state
  - Disconnected (gray)
  - Connecting... (orange, with spinner)
  - Connected (green)
  - Recording (red, with pulsing dot)
  - Error (red)
- **Error Message**: Shows if error occurs (truncated)

### Transcript Display
- **Container**: White rounded card with border
- **Scroll View**: Auto-scrolls to bottom on new text
- **Placeholder**: Shows "Tap Start to begin live transcription" when empty
- **Final Lines**: Black text, regular weight
- **Partial Line**: Gray italic text with blinking cursor (|)

### Controls
- **Start Button**:
  - Blue background (#3B82F6)
  - Microphone icon 🎤
  - Shows spinner when connecting
  - Disabled when error or already recording
- **Stop Button**:
  - Red background (#EF4444)
  - Stop icon ⏹
  - Only visible when recording
- **Clear Button**:
  - Gray background (#6B7280)
  - Only visible when stopped and transcript exists

### Footer
- **Info Text**: 
  - "⚡ Powered by Gemini 2.5 Flash"
  - "🔒 Ephemeral tokens • No API key in app"

## State Management

### Local State
```typescript
status: ConnectionStatus           // Connection/recording status
transcriptLines: string[]          // Final transcript lines
currentLine: string                // Current partial line (updates in real-time)
error: string | null               // Error message if any
```

### Service Reference
```typescript
serviceRef: GeminiLiveService      // Singleton service instance
```

## Behavior

### Start Flow
1. User taps "Start"
2. Button shows spinner, disabled
3. Service fetches ephemeral token from Supabase Edge Function
4. Service connects to Gemini Live WebSocket
5. Service requests microphone permission
6. Service starts audio capture
7. Status changes: DISCONNECTED → CONNECTING → CONNECTED → RECORDING
8. Button changes to "Stop"

### Transcription Updates
1. Service receives partial transcript from WebSocket
2. Updates `currentLine` (gray italic text with cursor)
3. User sees text appear in real-time
4. Service receives final transcript
5. Moves `currentLine` to `transcriptLines` array
6. Clears `currentLine`
7. Auto-scrolls to bottom

### Stop Flow
1. User taps "Stop"
2. Service stops audio capture
3. Service closes WebSocket
4. Status changes to DISCONNECTED
5. Button changes to "Start"
6. "Clear" button appears

### Error Handling
- Token fetch fails → Show error alert and error text
- Microphone permission denied → Show error alert
- WebSocket connection fails → Show error alert, status ERROR
- Token expired during session → Service attempts reconnect (not implemented in MVP)

## Design Tokens

### Colors
- Background: `#F9FAFB` (light gray)
- Card: `#FFF` (white)
- Primary: `#3B82F6` (blue)
- Danger: `#EF4444` (red)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (orange)
- Text Primary: `#111827` (near black)
- Text Secondary: `#6B7280` (gray)
- Text Tertiary: `#9CA3AF` (light gray)

### Typography
- Title: 28px, bold (700)
- Subtitle: 14px, regular
- Status Badge: 12px, semibold (600), uppercase
- Transcript: 16px, line height 24px
- Button: 16px, semibold (600)
- Footer: 12px, regular

### Spacing
- Header padding: 60px top, 20px horizontal, 16px bottom
- Status bar padding: 12px vertical, 20px horizontal
- Transcript margin: 16px all sides
- Transcript padding: 16px
- Controls padding: 20px all sides
- Button padding: 16px vertical, 32px horizontal
- Button gap: 12px

### Borders & Radius
- Card radius: 12px
- Button radius: 12px
- Status badge radius: 12px
- Border color: `#E5E7EB`
- Border width: 1px

### Shadows
- Button shadow: 0px 2px 4px rgba(0,0,0,0.1)

## Dependencies

### Services
- `GeminiLiveService` from `../../services/geminiLive`

### Libraries
- `react-native`: View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator
- `react`: useState, useRef, useEffect

## Navigation
- Standalone screen (not part of main tab navigation in MVP)
- Can be accessed via deep link or dev menu

## Future Enhancements
- Save transcript to notes
- Export transcript as text/PDF
- Language selection
- Real-time word count
- Timestamp markers
- Pause/Resume (currently only Start/Stop)
