# LoadingState Component

Skeleton loaders that match the shape of actual content.

## Purpose

Provide consistent loading UI that maintains layout and prevents content shift.

## Props

```typescript
interface LoadingStateProps {
  variant: 'card' | 'list' | 'grid'; // Layout variant
  count?: number;                     // Number of skeletons (default 3)
  style?: ViewStyle;                  // Style override
}
```

## Variants

### Card
Single skeleton card matching card dimensions:
- Height: 120px (or match actual card)
- Rounded: 12px (md)
- Padding: 16px (md)
- Contains 2-3 skeleton lines

### List
Vertical list of skeleton cards:
- Multiple cards (count prop)
- 16px gap between cards
- Each card matches card variant

### Grid
2-column grid of skeleton cards:
- Multiple cards (count prop)
- 16px gap between columns and rows
- Each card matches action card dimensions

## Skeleton Appearance

- **Background**: `#F3F4F6` (light gray)
- **Animation**: Subtle pulse (opacity 0.5 → 1.0)
- **Duration**: 1.5s ease-in-out, infinite
- **No borders or shadows**

## Skeleton Line

For text placeholders within skeleton cards:
- **Height**: Match text line height
- **Width**: Vary (80%, 100%, 60%) for natural look
- **Rounded**: 4px
- **Spacing**: 8px between lines

## Usage Examples

```typescript
// Loading classes (Home screen)
<LoadingState variant="list" count={5} />

// Loading action cards (StudyHub screen)
<LoadingState variant="grid" count={4} />

// Loading single card
<LoadingState variant="card" />
```

## Animation

Use React Native's `Animated` API or `react-native-reanimated`:
```typescript
// Pulse animation
opacity: [0.5, 1.0, 0.5]
duration: 1500ms
easing: ease-in-out
iterations: infinite
```

## Accessibility

- Announce "Loading" to screen readers
- Don't block navigation or interaction
- Minimum display time: 300ms to avoid flash

## Design Tokens Used

- `colors.borderLight` (#F3F4F6) for skeleton background
- `radii.md` (12px)
- `spacing.md` (16px)
- Match actual card dimensions from `Card` component
