# App Entry Point

This file will contain the main application component that initializes the app.

## Responsibilities

- Set up navigation container
- Initialize Supabase client
- Provide global context providers (auth, state)
- Handle deep linking configuration
- Set up error boundaries

## Expected Structure

```typescript
- Import React Navigation
- Import Supabase client
- Import global providers
- Define App component
- Wrap navigation with providers
- Export App
```

## Dependencies

- `@react-navigation/native`
- `@supabase/supabase-js`
- Global state providers from `../state/`
