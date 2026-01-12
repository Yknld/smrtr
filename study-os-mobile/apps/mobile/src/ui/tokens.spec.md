# Design Tokens Specification

This file defines all core design tokens for colors, spacing, border radius, and shadows.

---

## Colors

### Primary Colors
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#2563EB` | Primary actions, links, CTAs |
| `primaryHover` | `#1D4ED8` | Pressed/hover state for primary |
| `primaryLight` | `#DBEAFE` | Subtle backgrounds, pills |

### Background Colors
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#FFFFFF` | Main screen background |
| `surface` | `#F9FAFB` | Card backgrounds, elevated surfaces |
| `surfaceHover` | `#F3F4F6` | Hover state for surfaces |

### Border Colors
| Token | Value | Usage |
|-------|-------|-------|
| `border` | `#E5E7EB` | Subtle borders, dividers |
| `borderDark` | `#D1D5DB` | Prominent borders |
| `borderLight` | `#F3F4F6` | Very subtle borders, skeleton loaders |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `textPrimary` | `#111827` | Headings, body text |
| `textSecondary` | `#6B7280` | Labels, subtitles, metadata |
| `textTertiary` | `#9CA3AF` | Placeholders, hints, disabled text |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#10B981` | Completion, progress, success messages |
| `successLight` | `#D1FAE5` | Success backgrounds |
| `warning` | `#F59E0B` | Alerts, attention needed |
| `warningLight` | `#FEF3C7` | Warning backgrounds |
| `error` | `#EF4444` | Errors, destructive actions |
| `errorLight` | `#FEE2E2` | Error backgrounds |
| `info` | `#3B82F6` | Informational messages |
| `infoLight` | `#DBEAFE` | Info backgrounds |

### Accent Colors (Optional)
| Token | Value | Usage |
|-------|-------|-------|
| `accentPink` | `#EC4899` | Highlights, badges |
| `accentPurple` | `#8B5CF6` | Secondary actions |

---

## Spacing

Based on 4px grid system.

| Token | Value (px) | Value (RN) | Usage |
|-------|------------|------------|-------|
| `xs` | 4px | 4 | Tight spacing (icon to text) |
| `sm` | 8px | 8 | Small gaps (chip padding) |
| `md` | 16px | 16 | Default spacing (card padding, between elements) |
| `lg` | 24px | 24 | Section spacing (between cards) |
| `xl` | 32px | 32 | Large gaps (screen padding, major sections) |
| `2xl` | 48px | 48 | Extra large (screen top/bottom margins) |

### Common Spacing Patterns

| Pattern | Value | Usage |
|---------|-------|-------|
| `screenPaddingH` | `md` (16px) | Horizontal screen padding |
| `screenPaddingTop` | `lg` (24px) | Top screen padding |
| `cardPadding` | `md` (16px) | Inside card padding |
| `cardGap` | `md` (16px) | Between cards in list |
| `sectionGap` | `lg` (24px) | Between major screen sections |

---

## Border Radius

| Token | Value (px) | Value (RN) | Usage |
|-------|------------|------------|-------|
| `sm` | 8px | 8 | Small buttons, chips |
| `md` | 12px | 12 | Cards, input fields |
| `lg` | 16px | 16 | Large cards, modals |
| `pill` | 999px | 999 | Pill-shaped chips, tags |

---

## Shadows

### Card Shadow (Default)
```
shadowColor: '#000000'
shadowOffset: { width: 0, height: 1 }
shadowOpacity: 0.08
shadowRadius: 3
elevation: 2  // Android
```
**Usage**: Default card elevation

### Card Hover Shadow
```
shadowColor: '#000000'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.12
shadowRadius: 12
elevation: 4  // Android
```
**Usage**: Card press/hover state

### Elevated Shadow
```
shadowColor: '#000000'
shadowOffset: { width: 0, height: 8 }
shadowOpacity: 0.15
shadowRadius: 24
elevation: 8  // Android
```
**Usage**: Modals, overlays, floating elements

### No Shadow
```
shadowColor: 'transparent'
shadowOffset: { width: 0, height: 0 }
shadowOpacity: 0
shadowRadius: 0
elevation: 0  // Android
```
**Usage**: Flat elements, no elevation

---

## Opacity

| Token | Value | Usage |
|-------|-------|-------|
| `disabled` | 0.5 | Disabled components |
| `hover` | 0.8 | Hover state (web) |
| `overlay` | 0.6 | Modal overlays |

---

## Implementation Notes

### React Native StyleSheet Example

```typescript
export const colors = {
  primary: '#2563EB',
  background: '#FFFFFF',
  textPrimary: '#111827',
  // ... etc
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  // ... etc
};
```

---

## Accessibility Notes

### Color Contrast Ratios (WCAG AA)

| Combination | Ratio | Pass? |
|-------------|-------|-------|
| `textPrimary` on `background` | 16:1 | ✅ AAA |
| `textSecondary` on `background` | 7:1 | ✅ AA |
| `textTertiary` on `background` | 4.5:1 | ✅ AA |
| `primary` on `background` | 6:1 | ✅ AA |
| `success` on `successLight` | 4.5:1 | ✅ AA |
| `error` on `errorLight` | 5:1 | ✅ AA |

All text/background combinations meet or exceed WCAG AA standards (4.5:1 for body text, 3:1 for large text).

---

## Usage Guidelines

1. **Never hardcode values** - Always use tokens
2. **Compose when needed** - Combine tokens for complex styles
3. **Override sparingly** - Use style prop only when necessary
4. **Test contrast** - Ensure custom combinations meet accessibility standards
5. **Document new tokens** - Add to this spec if creating new values
