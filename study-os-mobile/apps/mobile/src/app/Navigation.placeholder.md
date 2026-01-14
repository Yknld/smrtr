# Navigation Configuration

This file will define the navigation structure for the app.

## Responsibilities

- Create stack navigator
- Define screen components
- Configure navigation options (headers, transitions)
- Set up navigation types for type-safe navigation

## Navigation Structure

```
Stack Navigator (Root)
├── Home Screen (initial)
├── ClassNotes Screen
└── StudyHub Screen
```

## Screen Options

- **Home**: No back button, title "Home"
- **ClassNotes**: Back button, dynamic title from params (className)
- **StudyHub**: Back button, dynamic title from params (className)

## Dependencies

- `@react-navigation/native`
- `@react-navigation/stack` or `@react-navigation/native-stack`
- Screen components from `../screens/`
