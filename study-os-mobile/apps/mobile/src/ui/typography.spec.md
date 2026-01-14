# Typography Specification

This file defines all typography tokens for font families, sizes, weights, and line heights.

---

## Font Families

### Primary Font Stack
```
iOS: SF Pro Text / SF Pro Display (system font)
Android: Roboto (system font)
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

### Implementation
Use system default fonts for best native experience:
```typescript
fontFamily: Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
})
```

---

## Type Scale

### Heading 1
| Property | Value |
|----------|-------|
| **Size** | 28px |
| **Weight** | 700 (Bold) |
| **Line Height** | 34px |
| **Letter Spacing** | -0.5px |
| **Usage** | Screen titles, page headings |

**Example**: "Home", "Biology 101" (screen title)

---

### Heading 2
| Property | Value |
|----------|-------|
| **Size** | 22px |
| **Weight** | 600 (Semibold) |
| **Line Height** | 28px |
| **Letter Spacing** | -0.25px |
| **Usage** | Section headings, large subheadings |

**Example**: "Your Classes", "Recently Studied"

---

### Heading 3
| Property | Value |
|----------|-------|
| **Size** | 18px |
| **Weight** | 600 (Semibold) |
| **Line Height** | 24px |
| **Letter Spacing** | 0px |
| **Usage** | Card titles, subsection headings |

**Example**: "Chemistry 201" (class name), "Continue" (action label)

---

### Body
| Property | Value |
|----------|-------|
| **Size** | 16px |
| **Weight** | 400 (Regular) |
| **Line Height** | 24px |
| **Letter Spacing** | 0px |
| **Usage** | Main content, paragraphs, readable text |

**Example**: Note content, descriptions

---

### Body Bold
| Property | Value |
|----------|-------|
| **Size** | 16px |
| **Weight** | 600 (Semibold) |
| **Line Height** | 24px |
| **Letter Spacing** | 0px |
| **Usage** | Emphasized content, highlighted text |

**Example**: Important note sections, labels

---

### Caption
| Property | Value |
|----------|-------|
| **Size** | 14px |
| **Weight** | 400 (Regular) |
| **Line Height** | 20px |
| **Letter Spacing** | 0px |
| **Usage** | Metadata, labels, secondary info |

**Example**: "Last studied 2 hours ago", "5 min read"

---

### Caption Bold
| Property | Value |
|----------|-------|
| **Size** | 14px |
| **Weight** | 600 (Semibold) |
| **Line Height** | 20px |
| **Letter Spacing** | 0px |
| **Usage** | Pill labels, badge text, emphasized captions |

**Example**: "Continue" (pill badge), "New" (badge)

---

### Small
| Property | Value |
|----------|-------|
| **Size** | 12px |
| **Weight** | 400 (Regular) |
| **Line Height** | 16px |
| **Letter Spacing** | 0px |
| **Usage** | Timestamps, hints, fine print |

**Example**: "2:30 PM", "Updated just now"

---

## Font Weights

Map semantic names to numeric values:

| Token | iOS | Android | Numeric |
|-------|-----|---------|---------|
| `regular` | Regular | normal | 400 |
| `medium` | Medium | 500 | 500 |
| `semibold` | Semibold | 600 | 600 |
| `bold` | Bold | bold | 700 |

---

## Typography Tokens (Implementation)

```typescript
export const typography = {
  heading1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.25,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
};
```

---

## Usage Examples

### Screen Title
```typescript
<Text style={[typography.heading1, { color: colors.textPrimary }]}>
  Biology 101
</Text>
```

### Section Heading
```typescript
<Text style={[typography.heading2, { color: colors.textPrimary }]}>
  Your Classes
</Text>
```

### Card Title
```typescript
<Text style={[typography.heading3, { color: colors.textPrimary }]}>
  Chemistry 201
</Text>
```

### Body Text
```typescript
<Text style={[typography.body, { color: colors.textPrimary }]}>
  This is a note about cellular respiration...
</Text>
```

### Metadata
```typescript
<Text style={[typography.caption, { color: colors.textSecondary }]}>
  Last studied 2 hours ago
</Text>
```

---

## Accessibility

### Font Size Guidelines
- **Minimum body text**: 16px (meets accessibility standards)
- **Minimum caption text**: 14px (acceptable for secondary info)
- **Small text**: Use sparingly, only for timestamps/hints

### Dynamic Type (iOS)
Consider supporting iOS Dynamic Type for accessibility:
- Respect user's font size preferences
- Test with larger text sizes
- Ensure layout doesn't break at 200% scale

### Text Contrast
All typography should use color tokens that meet WCAG AA contrast ratios:
- `textPrimary` for high emphasis (headings, body)
- `textSecondary` for medium emphasis (captions, labels)
- `textTertiary` for low emphasis (hints, placeholders)

---

## Line Height Guidelines

Line heights are set for optimal readability:
- **Body text**: 1.5x font size (24px / 16px = 1.5)
- **Headings**: 1.2x font size (tighter for large text)
- **Small text**: 1.33x font size (16px / 12px = 1.33)

These ratios ensure comfortable reading without excessive space.

---

## Letter Spacing Guidelines

- **Large headings**: Negative spacing (-0.5px) for tighter feel
- **Medium headings**: Slight negative spacing (-0.25px)
- **Body text**: No letter spacing (0px) for natural flow
- **Small text**: No letter spacing (0px)

---

## Platform-Specific Notes

### iOS
- Use San Francisco (SF) system fonts
- Respect Dynamic Type settings
- Font weights render accurately

### Android
- Use Roboto system font
- Font weights may appear slightly different
- Test on multiple devices for consistency

---

## Best Practices

1. **Use semantic names** - `typography.heading1`, not `fontSize: 28`
2. **Pair with color tokens** - Always use `colors.textPrimary` etc.
3. **Don't override line height** - Use defined values for consistency
4. **Test on devices** - Typography renders differently on iOS vs Android
5. **Limit font sizes** - Stick to defined scale, don't create custom sizes
