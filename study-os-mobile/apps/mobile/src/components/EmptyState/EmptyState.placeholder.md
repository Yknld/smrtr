# EmptyState Component

A centered message display for when no data is available.

## Purpose

Provide consistent empty state UI across all screens with optional action button.

## Props

```typescript
interface EmptyStateProps {
  icon: ReactNode;               // Icon or illustration (64px)
  heading: string;               // Main message
  subtext: string;               // Supporting text
  action?: {                     // Optional action button
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;             // Style override
}
```

## Layout

- **Container**: Centered vertically and horizontally
- **Max width**: 280px
- **Spacing**:
  - Icon to heading: 16px (md)
  - Heading to subtext: 8px (sm)
  - Subtext to button: 24px (lg)

## Typography

- **Heading**: Heading 2 (22px semibold, #111827)
- **Subtext**: Body (16px regular, #6B7280)
- **Button**: Primary button style

## Icon Guidelines

- Size: 64x64px
- Color: `#9CA3AF` (text tertiary)
- Style: Outlined, not filled
- Centered

## Usage Examples

```typescript
// No classes
<EmptyState
  icon={<BookIcon />}
  heading="No classes yet"
  subtext="Add your first class to start studying"
  action={{
    label: "Add Class",
    onPress: handleAddClass
  }}
/>

// No notes
<EmptyState
  icon={<DocumentIcon />}
  heading="No notes yet"
  subtext="Notes from your study sessions will appear here"
/>

// Error state (alternative use)
<EmptyState
  icon={<AlertIcon />}
  heading="Couldn't load notes"
  subtext="Check your connection and try again"
  action={{
    label: "Try Again",
    onPress: handleRetry
  }}
/>
```

## Accessibility

- Heading should be properly labeled for screen readers
- Button should have clear accessible label
- Icon should be decorative (no alt text needed)

## Design Tokens Used

- `colors.textPrimary` (#111827)
- `colors.textSecondary` (#6B7280)
- `colors.textTertiary` (#9CA3AF)
- `spacing.sm` (8px)
- `spacing.md` (16px)
- `spacing.lg` (24px)
- `typography.heading2` (22px semibold)
- `typography.body` (16px)
