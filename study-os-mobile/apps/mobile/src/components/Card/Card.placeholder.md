# Card Component

A rounded container with shadow for displaying grouped content.

## Purpose

Provide consistent card styling across the app (class cards, note cards, action cards).

## Props

```typescript
interface CardProps {
  children: ReactNode;          // Card content
  onPress?: () => void;          // Optional tap handler
  variant?: 'default' | 'primary' | 'disabled';  // Visual variant
  style?: ViewStyle;             // Style override
}
```

## Variants

### Default
- Background: `#FFFFFF` (white)
- Border: 1px solid `#E5E7EB` (border)
- Shadow: Card shadow
- Rounded: 12px (md)

### Primary
- Background: `#2563EB` (primary blue)
- Text color: White
- No border
- Shadow: Elevated
- Rounded: 12px (md)

### Disabled
- Opacity: 0.5
- Not pressable
- Same styling as default

## Press State

When `onPress` is provided and card is tapped:
- Scale: 0.98
- Shadow: Increase to elevated
- Duration: 150ms

## Usage Examples

```typescript
// Class card
<Card onPress={() => navigate('StudyHub')}>
  <Text>Biology 101</Text>
  <Text>Last studied 2 hours ago</Text>
</Card>

// Note card
<Card>
  <Text>Jan 9, 2026</Text>
  <Text>Note content preview...</Text>
</Card>

// Primary action card
<Card variant="primary" onPress={handleStudy}>
  <Text>Continue</Text>
</Card>
```

## Design Tokens Used

- `colors.background` (#FFFFFF)
- `colors.primary` (#2563EB)
- `colors.border` (#E5E7EB)
- `radii.md` (12px)
- `spacing.md` (16px for padding)
- `shadows.card`
