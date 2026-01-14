# Pill Component

A rounded badge/chip for displaying tags, status, or small actions.

## Purpose

Provide consistent pill-shaped elements for badges, tags, and compact actions.

## Props

```typescript
interface PillProps {
  label: string;                 // Text to display
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  size?: 'sm' | 'md';            // Size variant
  onPress?: () => void;          // Optional tap handler
  style?: ViewStyle;             // Style override
}
```

## Variants

### Primary
- Background: `#DBEAFE` (primary light)
- Text: `#2563EB` (primary blue)
- Font: 14px semibold

### Secondary
- Background: `#F9FAFB` (surface)
- Text: `#6B7280` (text secondary)
- Font: 14px semibold

### Success
- Background: `#D1FAE5` (success light)
- Text: `#10B981` (success)
- Font: 14px semibold

### Warning
- Background: `#FEF3C7` (warning light)
- Text: `#F59E0B` (warning)
- Font: 14px semibold

## Sizes

### Small (sm)
- Padding: 4px horizontal, 2px vertical
- Font: 12px semibold

### Medium (md) - default
- Padding: 6px horizontal, 4px vertical
- Font: 14px semibold

## Styling

- Rounded: 999px (pill)
- No border
- No shadow

## Usage Examples

```typescript
// "Continue" badge
<Pill label="Continue" variant="primary" />

// "5 min recap" tag
<Pill label="5 min recap" variant="secondary" size="sm" />

// "New" badge
<Pill label="New" variant="success" />

// Tappable filter chip (future)
<Pill label="Biology" variant="secondary" onPress={handleFilter} />
```

## Design Tokens Used

- `colors.primaryLight` (#DBEAFE)
- `colors.primary` (#2563EB)
- `colors.surface` (#F9FAFB)
- `colors.textSecondary` (#6B7280)
- `radii.pill` (999px)
- `spacing.sm` (4-6px for padding)
- `typography.caption` (14px)
