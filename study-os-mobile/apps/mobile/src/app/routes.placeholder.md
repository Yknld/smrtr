# Route Definitions

This file will define route names and parameter types for type-safe navigation.

## Responsibilities

- Define route name constants
- Define route parameter types
- Export for use in screens and navigation

## Expected Route Types

```typescript
type RootStackParamList = {
  Home: undefined;
  ClassNotes: {
    classId: string;
    className: string;
  };
  StudyHub: {
    classId: string;
    className: string;
    hasResumableSession?: boolean;
  };
};
```

## Usage

Screens will use these types to ensure navigation params are type-safe:

```typescript
type ClassNotesScreenProps = StackScreenProps<RootStackParamList, 'ClassNotes'>;
```
