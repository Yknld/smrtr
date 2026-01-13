# UI Style Guide

This document defines the visual design system for Study OS mobile, inspired by the provided reference layout but adapted for **light mode**.

## Design Principles

1. **Clean and minimal** - Reduce visual clutter, focus on content
2. **Rounded and soft** - Use rounded corners and pill shapes
3. **Breathing room** - Generous spacing between elements
4. **Readable** - High contrast text on light backgrounds
5. **Tactile** - Clear interactive areas with subtle shadows

---

## Color Palette (Light Mode)

### Primary Colors
- **Primary Blue**: `#2563EB` (actions, CTAs, links)
- **Primary Blue Hover**: `#1D4ED8` (pressed state)
- **Primary Blue Light**: `#DBEAFE` (subtle backgrounds)

### Neutral Colors
- **Background**: `#FFFFFF` (main background)
- **Surface**: `#F9FAFB` (card backgrounds, elevated surfaces)
- **Border**: `#E5E7EB` (subtle borders, dividers)
- **Border Dark**: `#D1D5DB` (prominent borders)

### Text Colors
- **Text Primary**: `#111827` (headings, body text)
- **Text Secondary**: `#6B7280` (labels, subtitles, metadata)
- **Text Tertiary**: `#9CA3AF` (placeholders, hints)

### Semantic Colors
- **Success**: `#10B981` (completion, progress)
- **Warning**: `#F59E0B` (alerts, attention)
- **Error**: `#EF4444` (errors, destructive actions)
- **Info**: `#3B82F6` (informational messages)

### Accent Colors (Optional)
- **Accent Pink**: `#EC4899` (highlights, badges)
- **Accent Purple**: `#8B5CF6` (secondary actions)

---

## Typography

### Font Family
- **Primary**: System font stack
  - iOS: SF Pro Text / SF Pro Display
  - Android: Roboto
- **Fallback**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Type Scale

| Style | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| **Heading 1** | 28px | 700 (Bold) | 34px | Screen titles |
| **Heading 2** | 22px | 600 (Semibold) | 28px | Section headings |
| **Heading 3** | 18px | 600 (Semibold) | 24px | Card titles, subsections |
| **Body** | 16px | 400 (Regular) | 24px | Main content, notes |
| **Body Bold** | 16px | 600 (Semibold) | 24px | Emphasized content |
| **Caption** | 14px | 400 (Regular) | 20px | Metadata, labels |
| **Small** | 12px | 400 (Regular) | 16px | Timestamps, hints |

### Typography Rules
- Use **Heading 1** for screen titles (e.g., "Home", "Biology 101")
- Use **Heading 3** for card titles (e.g., "Chemistry 201")
- Use **Body** for all readable content
- Use **Caption** for secondary info (e.g., "Last studied 2 hours ago")
- Use **Small** for timestamps and metadata

---

## Spacing System

Consistent spacing using multiples of 4px:

| Token | Value | Use Case |
|-------|-------|----------|
| **xs** | 4px | Tight spacing (icon to text) |
| **sm** | 8px | Small gaps (chip padding) |
| **md** | 16px | Default spacing (card padding, between elements) |
| **lg** | 24px | Section spacing (between cards) |
| **xl** | 32px | Large gaps (screen padding, major sections) |
| **2xl** | 48px | Extra large (screen top/bottom margins) |

### Layout Rules
- **Screen padding**: 16px (md) horizontal, 24px (lg) top
- **Card padding**: 16px (md) all sides
- **Card gap**: 16px (md) between cards in a list
- **Section gap**: 24px (lg) between screen sections

---

## Border Radius

Rounded corners for modern, friendly feel:

| Token | Value | Use Case |
|-------|-------|----------|
| **sm** | 8px | Small buttons, chips |
| **md** | 12px | Cards, input fields |
| **lg** | 16px | Large cards, modals |
| **pill** | 999px | Pill-shaped chips, tags |

### Radius Rules
- **Class cards**: 12px (md)
- **Action cards**: 12px (md)
- **Pill chips**: 999px (pill) - e.g., "Continue" badge
- **Buttons**: 8px (sm) for compact, 12px (md) for primary

---

## Shadows & Elevation

Subtle shadows for depth without heaviness:

| Level | Shadow | Use Case |
|-------|--------|----------|
| **None** | `none` | Flat elements, no elevation |
| **Card** | `0 1px 3px rgba(0,0,0,0.08)` | Default card elevation |
| **Card Hover** | `0 4px 12px rgba(0,0,0,0.12)` | Card press/hover state |
| **Elevated** | `0 8px 24px rgba(0,0,0,0.15)` | Modals, overlays |

### Shadow Rules
- Use **Card** shadow for all class cards and action cards
- Use **Card Hover** shadow on press (increase elevation)
- Use **Elevated** shadow for modals and floating elements

---

## Component Styles

### Class Card (Home Screen)

**Layout**:
- Rounded: 12px (md)
- Padding: 16px (md)
- Background: `#FFFFFF` (white)
- Border: 1px solid `#E5E7EB` (border)
- Shadow: Card shadow

**Content**:
- **Class name**: Heading 3 (18px, semibold, #111827)
- **Metadata**: Caption (14px, #6B7280) - e.g., "Last studied 2 hours ago"
- **Progress bar**: 4px height, rounded, #DBEAFE background, #2563EB fill
- **Actions**: Pill chips or text buttons

**Spacing**:
- 12px gap between class name and metadata
- 8px gap between metadata and actions

---

### Pill Chip (Tags, Actions)

**Layout**:
- Rounded: 999px (pill)
- Padding: 6px horizontal, 4px vertical (sm)
- Background: `#DBEAFE` (primary light) for default, `#F9FAFB` for secondary
- Text: Caption (14px, semibold, #2563EB for primary)

**Use Cases**:
- "Continue studying" badge
- "5 min recap" tag
- Filter chips (future)

---

### Action Card (StudyHub Screen)

**Layout**:
- Rounded: 12px (md)
- Padding: 20px (between md and lg)
- Background: `#FFFFFF` (white)
- Border: 1px solid `#E5E7EB`
- Shadow: Card shadow
- **Hover/Press**: Border becomes `#2563EB`, shadow increases

**Content**:
- **Icon**: 24x24px, placed left or top
- **Label**: Heading 3 (18px, semibold, #111827)
- **Description**: Caption (14px, #6B7280) - optional subtext

**States**:
- **Default**: White background, gray border
- **Primary** (e.g., "Continue"): Blue background `#2563EB`, white text
- **Disabled**: Opacity 0.5, not tappable

---

### Empty State

**Layout**:
- Centered vertically and horizontally
- Max width: 280px

**Content**:
- **Icon**: 64x64px, gray `#9CA3AF`, centered
- **Heading**: Heading 2 (22px, semibold, #111827)
- **Subtext**: Body (16px, #6B7280), centered, 16px top margin
- **Button** (optional): Primary button, 24px top margin

---

### Loading State (Skeleton)

**Layout**:
- Match target component dimensions (e.g., card size)
- Rounded corners match target

**Appearance**:
- Background: `#F3F4F6` (light gray)
- Animation: Shimmer effect (subtle pulse)
- No borders or shadows

**Usage**:
- Show 3-5 skeleton cards during loading
- Maintain layout to prevent content shift

---

## Button Styles

### Primary Button
- **Background**: `#2563EB` (primary blue)
- **Text**: 16px, semibold, white
- **Padding**: 12px vertical, 24px horizontal
- **Rounded**: 8px (sm)
- **Shadow**: None
- **Press**: Background becomes `#1D4ED8`

### Secondary Button
- **Background**: Transparent
- **Text**: 16px, semibold, `#2563EB`
- **Border**: 1px solid `#2563EB`
- **Padding**: 12px vertical, 24px horizontal
- **Rounded**: 8px (sm)

### Text Button
- **Background**: Transparent
- **Text**: 16px, semibold, `#2563EB`
- **No border, no padding**
- **Press**: Text becomes `#1D4ED8`

---

## Icon Style

- **Size**: 24x24px default, 20x20px for small contexts
- **Style**: Outlined (stroke-based), not filled
- **Color**: Match surrounding text color
- **Stroke**: 2px
- **Spacing**: 8px (sm) from adjacent text

**Icon Library**: Use a consistent library (e.g., Heroicons, Feather Icons)

---

## Interactive States

### Tap/Press States
- **Cards**: Increase shadow (Card → Card Hover), scale 0.98
- **Buttons**: Darken background by 10%
- **Text links**: Change color to darker shade

### Disabled States
- **Opacity**: 0.4-0.5
- **Pointer events**: None (not tappable)
- **Visual**: Gray out text/icons

### Focus States (Accessibility)
- **Outline**: 2px solid `#2563EB`, 2px offset
- **Visible on keyboard navigation**

---

## Layout Patterns

### Screen Layout
```
┌─────────────────────────────────┐
│  [Padding: 16px]                │
│  ┌─────────────────────────┐   │
│  │ Screen Title (H1)       │   │ ← 24px top padding
│  └─────────────────────────┘   │
│                                 │ ← 24px gap
│  ┌─────────────────────────┐   │
│  │ Card 1                   │   │
│  └─────────────────────────┘   │
│                                 │ ← 16px gap
│  ┌─────────────────────────┐   │
│  │ Card 2                   │   │
│  └─────────────────────────┘   │
│                                 │
│  [Padding: 16px]                │
└─────────────────────────────────┘
```

### Card Layout
```
┌──────────────────────────┐
│  [Padding: 16px]         │
│  ┌────────────────────┐  │
│  │ Heading 3          │  │ ← Card title
│  └────────────────────┘  │
│                          │ ← 8px gap
│  Caption text            │ ← Metadata
│                          │ ← 12px gap
│  [Action buttons/chips]  │
│  [Padding: 16px]         │
└──────────────────────────┘
```

---

## Reference Comparison

**From reference layout** (adapted to light mode):
- **Rounded cards**: ✅ 12px radius
- **Pill chips**: ✅ 999px radius, subtle background
- **Clean spacing**: ✅ 16px/24px system
- **Modern feel**: ✅ Shadows, high contrast

**Key difference**: Light mode uses white/light gray backgrounds instead of dark backgrounds, with dark text instead of light text.

---

## Accessibility Notes

- **Contrast ratios**: All text meets WCAG AA standards
  - Text Primary (#111827) on white: 16:1
  - Text Secondary (#6B7280) on white: 7:1
  - Primary Blue (#2563EB) on white: 6:1
- **Touch targets**: Minimum 44x44px for all interactive elements
- **Focus indicators**: Visible blue outline for keyboard navigation

---

## Implementation Notes

These values should be defined in `src/ui/tokens.spec.md` and consumed by all components. No hardcoded values in component files.

This style guide provides a starting point - refine based on actual design mockups or user testing.
