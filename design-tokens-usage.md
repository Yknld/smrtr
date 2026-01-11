# Design Tokens Usage Notes

## Overview
This design token system provides a minimal, reusable set of values for the study workspace web app. All tokens are optimized for light mode with a warm, soft-tinted neutral background.

---

## Color Usage

### Backgrounds
- **`colors.background.base`**: Apply to the main app container and workspace background. Provides a warm, off-white tint (#FAFAF9) to avoid pure white glare.
- **`colors.surface.card`**: Use for cards, elevated surfaces, sidebars, and panels. Pure white creates subtle contrast against the warm base background.

### Borders
- **`colors.border.hairline`**: Apply to all borders, dividers, and subtle outlines. Light gray (#E5E7EB) maintains separation without harsh contrast.

### Shadows
- **`colors.shadow.subtle`**: Default shadow for cards and elevated surfaces. Use for normal state elevation.
- **`colors.shadow.hover`**: Apply on hover states to create lift feedback. Combine with motion tokens for smooth elevation transitions.

### Primary Accent
- **`colors.primary.accent`**: Main brand color (#4F46E5) for buttons, links, active states, and primary actions.
- **`colors.primary.accentHover`**: Darker shade for hover states on primary elements.
- **`colors.primary.accentMuted`**: Light tinted background for highlighting primary-related content areas (e.g., selected items, active sections).

### Text
- **`colors.text.primary`**: Use for body text, headings, and primary content (#111827). High contrast on light backgrounds.
- **`colors.text.muted`**: Apply to secondary text, captions, metadata, placeholders, and helper text (#6B7280). Maintains readability while de-emphasizing.

### Status Colors
- **`colors.status.ready`**: Green (#10B981) for success states, completed items, positive indicators.
- **`colors.status.processing`**: Amber (#F59E0B) for in-progress, loading, or pending states.
- **`colors.status.failed`**: Red (#EF4444) for errors, failures, destructive actions.
- **Status backgrounds** (`readyBg`, `processingBg`, `failedBg`): Use as subtle background tints for status badges, pills, or highlighted status areas.

---

## Typography Usage

### Font Families
- **`typography.fontFamily.sans`**: Default system font stack. Provides native OS font rendering for optimal readability and performance.
- **`typography.fontFamily.heading`**: Same as sans by default. Can be customized separately if needed.

### Font Sizes
- **`typography.fontSize.h1`** (2rem/32px): Page-level headings, major section titles.
- **`typography.fontSize.h2`** (1.5rem/24px): Section headings, card titles, subsection headers.
- **`typography.fontSize.body`** (1rem/16px): Default body text, paragraph content, list items.
- **`typography.fontSize.caption`** (0.875rem/14px): Metadata, timestamps, helper text, small labels.

### Font Weights
- **`typography.fontWeight.regular`** (400): Default for body text.
- **`typography.fontWeight.medium`** (500): Emphasis within body text, secondary labels.
- **`typography.fontWeight.semibold`** (600): Headings, primary labels, interactive element labels.
- **`typography.fontWeight.bold`** (700): Strong emphasis, important headings.

### Line Heights
- **`typography.lineHeight.tight`** (1.25): Use with headings for compact display.
- **`typography.lineHeight.normal`** (1.5): Default for body text, provides comfortable reading.
- **`typography.lineHeight.relaxed`** (1.75): Use for longer paragraphs or accessibility-focused content.

---

## Spacing Usage

The spacing scale uses a base unit of 16px (1rem = `md`). Scale values:
- **`spacing.scale.xs`** (4px): Tight spacing within components, icon padding.
- **`spacing.scale.sm`** (8px): Small gaps, compact layouts, tight groupings.
- **`spacing.scale.md`** (16px): **Base unit**. Default padding, margins between elements, standard component spacing.
- **`spacing.scale.lg`** (24px): Larger gaps, section spacing, comfortable padding.
- **`spacing.scale.xl`** (32px): Major section separation, large component padding.
- **`spacing.scale.2xl`** (48px): Page-level spacing, hero sections.
- **`spacing.scale.3xl`** (64px): Maximum spacing, major layout divisions.

**Best Practice**: Use consistent spacing values throughout the UI. For example, card padding might be `md` or `lg`, while gaps between cards use `md` or `lg` depending on density.

---

## Radius Usage

- **`radius.card`** (12px): Apply to all cards, elevated surfaces, panels, and main containers. Provides the characteristic rounded appearance.
- **`radius.pill`** (9999px): Use for fully rounded elements like pills, badges, toggle switches, fully rounded buttons.
- **`radius.sm`** (6px): Use for small rounded corners on input fields, small badges, compact elements.

**Consistency**: Maintain rounded surfaces throughout the UI to reinforce the premium, calm aesthetic.

---

## Motion Usage

### Duration
- **`motion.duration.fast`** (150ms): Hover states, micro-interactions, quick feedback.
- **`motion.duration.normal`** (250ms): Standard transitions for color, opacity, transform changes.
- **`motion.duration.slow`** (400ms): More deliberate animations like panel slides, modal entrances.

### Easing
- **`motion.easing.easeInOut`**: Default for most transitions. Smooth acceleration and deceleration.
- **`motion.easing.easeOut`**: Use for entrances (fade in, slide in). Feels natural and responsive.
- **`motion.easing.easeIn`**: Use for exits (fade out, slide out). Quick start, slower end.
- **`motion.easing.spring`**: Use sparingly for playful, bouncy interactions (optional for delightful moments).

### Distance
- **`motion.distance.hoverLift`** (2px): Combine with `shadow.hover` to create card lift effect on hover: `transform: translateY(-2px)`.
- **`motion.distance.fadeDistance`**: Use for opacity transitions combined with slight movement (fade + small translate).
- **`motion.distance.slideDistance`** (16px): Use for sidebar animations, panel slides, modal entrances/exits. Apply as `translateX(16px)` or `translateY(16px)`.

**Animation Example** (hover lift):
```css
/* Pseudo-code - do not implement, just illustration */
transition: transform motion.duration.fast motion.easing.easeOut;
:hover {
  transform: translateY(-motion.distance.hoverLift);
  box-shadow: motion.shadow.hover;
}
```

---

## Token Access Patterns

### CSS Custom Properties (Recommended)
Map tokens to CSS variables for runtime theming and easier maintenance:
```css
/* Example structure - not implementation code */
:root {
  --color-background-base: #FAFAF9;
  --color-primary-accent: #4F46E5;
  --spacing-md: 1rem;
  /* etc. */
}
```

### JavaScript/TypeScript
Import the JSON file and access nested properties:
```
tokens.colors.background.base
tokens.typography.fontSize.h1
tokens.motion.duration.normal
```

---

## Guidelines

1. **Consistency**: Always use tokens instead of hardcoded values. If a value isn't available, extend the token system rather than adding magic numbers.

2. **Semantic Usage**: Use tokens based on their semantic meaning, not their visual appearance alone. For example, use `colors.text.muted` for metadata even if it appears similar to border colors.

3. **Combination**: Combine tokens effectively. For example, a card might use: `background: colors.surface.card`, `border-radius: radius.card`, `box-shadow: colors.shadow.subtle`, `padding: spacing.scale.lg`.

4. **Status Colors**: When displaying status, combine the status color with its background tint for subtle, premium appearance (e.g., `background: colors.status.readyBg`, `color: colors.status.ready`).

5. **Motion**: Keep animations subtle and purposeful. Use fast durations for hover feedback, normal for transitions, slow for major UI changes. Avoid excessive animation.

---

## Notes

- All color values are provided in hex format for direct use.
- Spacing and radius values use rem units (base 16px) for accessibility and scalability.
- Motion durations are in milliseconds for direct CSS/JS usage.
- The system is optimized for light mode only. Dark mode tokens are intentionally excluded.
