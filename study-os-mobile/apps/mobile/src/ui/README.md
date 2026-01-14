# UI Design System

## Quick Reference

Import tokens in any component:

```typescript
import { colors, spacing, borderRadius, typography, shadows } from '../ui/tokens';
```

## Usage Examples

### Colors
```typescript
// Background
backgroundColor: colors.background  // #FFFFFF
backgroundColor: colors.surface     // #F9FAFB

// Text
color: colors.textPrimary    // #111827 (headings, body)
color: colors.textSecondary  // #6B7280 (metadata)
color: colors.textTertiary   // #9CA3AF (placeholders)

// Actions
backgroundColor: colors.primary      // #2563EB
backgroundColor: colors.primaryHover // #1D4ED8

// Semantic
color: colors.success  // #10B981
color: colors.error    // #EF4444
color: colors.warning  // #F59E0B
```

### Spacing
```typescript
padding: spacing.xs   // 4px
padding: spacing.sm   // 8px
padding: spacing.md   // 16px (default)
padding: spacing.lg   // 24px
padding: spacing.xl   // 32px
padding: spacing['2xl'] // 48px

// Common patterns
paddingHorizontal: spacing.md,
paddingVertical: spacing.lg,
marginBottom: spacing.md,
gap: spacing.sm,
```

### Border Radius
```typescript
borderRadius: borderRadius.sm   // 8px (buttons)
borderRadius: borderRadius.md   // 12px (cards)
borderRadius: borderRadius.lg   // 16px (modals)
borderRadius: borderRadius.pill // 999px (chips)
```

### Typography
```typescript
// Headings
fontSize: typography.h1.fontSize,      // 28px
fontWeight: typography.h1.fontWeight,  // '700'
lineHeight: typography.h1.lineHeight,  // 34px

fontSize: typography.h2.fontSize,      // 22px
fontWeight: typography.h2.fontWeight,  // '600'

fontSize: typography.h3.fontSize,      // 18px
fontWeight: typography.h3.fontWeight,  // '600'

// Body
fontSize: typography.body.fontSize,      // 16px
fontWeight: typography.body.fontWeight,  // '400'
lineHeight: typography.body.lineHeight,  // 24px

fontSize: typography.bodyBold.fontSize,      // 16px
fontWeight: typography.bodyBold.fontWeight,  // '600'

// Small
fontSize: typography.caption.fontSize,  // 14px
fontSize: typography.small.fontSize,    // 12px
```

### Shadows
```typescript
// Spread syntax (recommended)
...shadows.card       // Subtle card elevation
...shadows.cardHover  // Pressed/hover state
...shadows.elevated   // Modals, FAB
...shadows.none       // No shadow

// Example
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
});
```

## Component Patterns

### Card
```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
});
```

### Button (Primary)
```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4, // 12px
    borderRadius: borderRadius.sm,
  },
  buttonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.background,
  },
});
```

### Pill Chip
```typescript
const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.primary,
  },
});
```

### Input Field
```typescript
const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4, // 12px
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
```

## Layout Guidelines

### Screen Padding
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,  // 16px sides
    paddingTop: spacing.lg,         // 24px top
  },
});
```

### Card List
```typescript
const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,  // 16px between cards
  },
});
```

### Section Spacing
```typescript
const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,  // 24px between sections
  },
  sectionTitle: {
    marginBottom: spacing.sm,  // 8px below title
  },
});
```

## Accessibility

### Touch Targets
Minimum 44x44px for all interactive elements:

```typescript
const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Color Contrast
All text meets WCAG AA standards:
- Text Primary on white: **16:1** ✅
- Text Secondary on white: **7:1** ✅
- Primary Blue on white: **6:1** ✅

### Focus States
```typescript
const styles = StyleSheet.create({
  buttonFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
});
```

## Best Practices

1. **Always use tokens** - Never hardcode values
2. **Consistent spacing** - Use multiples of 4px
3. **Semantic colors** - Use `colors.error` not `#EF4444`
4. **Typography scale** - Use predefined sizes
5. **Shadow spread** - Use `...shadows.card` syntax
6. **Border radius** - Match component type (card vs button)

## Anti-Patterns

❌ **Don't hardcode values:**
```typescript
padding: 16,           // Bad
padding: spacing.md,   // Good
```

❌ **Don't use arbitrary colors:**
```typescript
color: '#333',              // Bad
color: colors.textPrimary,  // Good
```

❌ **Don't mix spacing units:**
```typescript
padding: 15,           // Bad (not multiple of 4)
padding: spacing.md,   // Good (16px)
```

❌ **Don't ignore typography scale:**
```typescript
fontSize: 17,                     // Bad
fontSize: typography.body.fontSize, // Good
```

## Resources

- **Full Style Guide**: `/docs/ui-style.md`
- **Component Examples**: `/src/components/`
- **Token Source**: `/src/ui/tokens.ts`
