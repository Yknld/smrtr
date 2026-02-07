# Study OS Mobile

A mobile-only React Native (TypeScript) application for managing study sessions, class notes, and learning progress.

## Project Overview

This is a **mobile-only** repository designed for iOS and Android platforms. The app provides a clean, focused study experience through three core screens:

1. **Home** - Choose which class to study
2. **Class Notes** - Review previous notes for a selected class
3. **Study Hub** - Take action (Study now, Continue, Quick recap, Flashcards)

## Repository Structure

```
study-os-mobile/
├── apps/mobile/        # Main React Native application
├── scripts/            # Build and automation scripts
└── README.md           # This file
```

## Design Philosophy

- **Mobile-first**: Optimized for iOS and Android devices
- **Light mode**: Clean, readable interface with rounded cards and pill chips
- **Happy path focus**: Streamlined UX for core study workflows
- **Clear boundaries**: Strict separation between screens, components, data, and state

## Getting Started

See `apps/mobile/README.md` for setup instructions and development conventions.

## Documentation

- [docs/OVERVIEW.md](docs/OVERVIEW.md) — How the app works and repository layout.
- [docs/FEATURES.md](docs/FEATURES.md) — One flowchart per feature.
- [docs/README.md](docs/README.md) — Documentation index.
- `apps/mobile/docs/` — Screen-level and UI docs (happy-path, screen-states, ui-style).
- `apps/mobile/PROJECT_STRUCTURE.md` — File and folder organization.

## Tech Stack

- **Framework**: React Native
- **Language**: TypeScript
- **Backend**: Supabase (authentication, database, real-time)
- **State**: Context/hooks-based state management
- **Navigation**: React Navigation (stack navigator)

## Ownership

This is a mobile-only codebase. Any web or desktop implementations should live in separate repositories.
