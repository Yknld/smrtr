# Study OS Mobile App

React Native application for iOS and Android.

## Purpose

This directory contains the complete mobile application code, documentation, and configuration for the Study OS learning platform.

## Development Conventions

### File Organization

- **screens/** - One folder per screen, containing spec documents for that screen's responsibilities
- **components/** - Reusable UI building blocks with clear, single responsibilities
- **ui/** - Design system tokens (colors, spacing, typography) - no components
- **data/** - Data fetching and repository patterns - no business logic
- **state/** - Application state management - no data fetching
- **types/** - TypeScript type definitions - single source of truth
- **utils/** - Pure utility functions (formatting, calculations)

### Naming Conventions

- Use PascalCase for component/screen names: `HomeScreen`, `Card`, `EmptyState`
- Use camelCase for function/variable names: `fetchClasses`, `userId`
- Use kebab-case for file names: `home-screen.tsx`, `card.tsx`
- Use `.spec.md` suffix for specification documents
- Use `.placeholder.md` for empty component markers

### Boundaries

**Screens MUST:**
- Handle navigation and route params
- Compose components and manage screen-level state
- Call data layer functions and handle loading/error states

**Screens MUST NOT:**
- Contain direct Supabase calls (use data layer)
- Implement reusable UI (extract to components/)
- Define design tokens (use ui/ system)

**Components MUST:**
- Be reusable across multiple screens
- Accept props for customization
- Remain pure (no side effects or data fetching)

**Components MUST NOT:**
- Navigate to other screens
- Fetch data directly
- Access global state (receive via props)

**Data Layer MUST:**
- Handle all Supabase interactions
- Return typed data structures
- Manage errors and retries

**Data Layer MUST NOT:**
- Update UI state directly
- Handle navigation
- Contain business logic

## Environment Setup

Copy `env.example` to `.env.local` and fill in required values:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Project Structure

See `PROJECT_STRUCTURE.md` for detailed file organization rules and rationale.

## Features

### Gemini Live Transcription
Real-time audio transcription using Google's Gemini Live API with ephemeral tokens.

**Key Features:**
- 🔒 Secure: GEMINI_API_KEY never leaves the server
- ⚡ Real-time: True live transcription with partial updates
- 🎯 Accurate: Powered by Gemini 2.5 Flash
- 🔐 Ephemeral tokens: Short-lived (30 min max, 1 min new session)

**Files:**
- `src/services/geminiLive.ts` - Core service
- `src/screens/LiveTranscription/LiveTranscriptionScreen.tsx` - UI
- `GEMINI_LIVE_SETUP.md` - Setup guide
- `docs/gemini-live.md` - Integration docs

**See:** `GEMINI_LIVE_SETUP.md` for installation and testing instructions.

## Documentation

- `docs/happy-path.md` - Core user journeys and navigation flow
- `docs/screen-states.md` - State management patterns per screen
- `docs/ui-style.md` - Design system and visual language
- `docs/gemini-live.md` - Gemini Live API integration guide