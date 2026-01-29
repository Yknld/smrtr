# Generation States Color Reference

Quick reference for the three badge states used in the Lesson Hub.

## State Colors

### 1. GENERATE (Default/Inactive)

```typescript
// Background
backgroundColor: colors.border  // Defined in ui/tokens

// Text
color: colors.textSecondary  // Defined in ui/tokens

// Border
none
```

**Visual**: Gray, subtle, neutral

---

### 2. GENERATING (In Progress)

```typescript
// Background
backgroundColor: 'rgba(96, 165, 250, 0.2)'  // Blue with 20% opacity

// Text
color: '#60A5FA'  // Blue-400 from Tailwind palette

// Border
borderWidth: 1
borderColor: '#60A5FA'  // Blue-400
```

**Visual**: Blue, active, processing

---

### 3. GENERATED (Complete/Success)

```typescript
// Background
backgroundColor: 'rgba(74, 222, 128, 0.2)'  // Green with 20% opacity

// Text
color: '#4ADE80'  // Green-400 from Tailwind palette

// Border
borderWidth: 1
borderColor: '#4ADE80'  // Green-400
```

**Visual**: Green, complete, success

---

## Color Swatches

```
GENERATING (Blue):
━━━━━━━━━━━━━━━━━━━━━
█ #60A5FA ██████████████
━━━━━━━━━━━━━━━━━━━━━
rgba(96, 165, 250, 1.0)
rgba(96, 165, 250, 0.2) ← background

GENERATED (Green):
━━━━━━━━━━━━━━━━━━━━━
█ #4ADE80 ██████████████
━━━━━━━━━━━━━━━━━━━━━
rgba(74, 222, 128, 1.0)
rgba(74, 222, 128, 0.2) ← background
```

## Usage in Code

### ActionTile Component

```typescript
// In ActionTile.tsx styles:

badgeGenerating: {
  backgroundColor: 'rgba(96, 165, 250, 0.2)',
  borderWidth: 1,
  borderColor: '#60A5FA',
},

badgeGenerated: {
  backgroundColor: 'rgba(74, 222, 128, 0.2)',
  borderWidth: 1,
  borderColor: '#4ADE80',
},

badgeTextGenerating: {
  color: '#60A5FA',
},

badgeTextGenerated: {
  color: '#4ADE80',
},
```

### Component Logic

```typescript
const getBadgeStyle = () => {
  if (badge === 'Generated') {
    return [styles.badge, styles.badgeGenerated];
  } else if (badge === 'Generating') {
    return [styles.badge, styles.badgeGenerating];
  }
  return styles.badge;
};
```

## Design Rationale

### Why Blue for "Generating"?
- Universal color for "in progress" or "active" states
- Associated with technology, processing, computing
- High contrast against dark backgrounds
- Not typically used for warnings or errors

### Why Green for "Generated"?
- Universal color for "success" or "complete" states
- Positive reinforcement for users
- Clear differentiation from "in progress"
- Associated with "ready" or "go" states

### Why Transparency (20%)?
- Subtle background doesn't overpower the UI
- Maintains focus on the icon and label
- Allows surface color to show through
- Works on both light and dark themes

### Why Border?
- Adds definition and clarity
- Makes badge stand out without being too bold
- Reinforces the state color
- Improves accessibility for color-blind users

## Accessibility Notes

### Color Contrast
- Blue text (#60A5FA) on dark background: ✅ WCAG AA
- Green text (#4ADE80) on dark background: ✅ WCAG AA
- Both colors work for most types of color blindness

### Non-Color Indicators
- Text changes ("Generate" → "Generating" → "Generated")
- Border appears/changes
- Disabled state prevents interaction
- Screen readers announce text changes

## Extending to Other States

### Possible Future States

#### Failed/Error State
```typescript
badgeFailed: {
  backgroundColor: 'rgba(248, 113, 113, 0.2)',  // Red
  borderWidth: 1,
  borderColor: '#F87171',  // Red-400
},
badgeTextFailed: {
  color: '#F87171',
}
```

#### Queued State
```typescript
badgeQueued: {
  backgroundColor: 'rgba(251, 191, 36, 0.2)',  // Yellow/Amber
  borderWidth: 1,
  borderColor: '#FBBF24',  // Amber-400
},
badgeTextQueued: {
  color: '#FBBF24',
}
```

#### Premium/Locked State
```typescript
badgePremium: {
  backgroundColor: 'rgba(168, 85, 247, 0.2)',  // Purple
  borderWidth: 1,
  borderColor: '#A855F7',  // Purple-500
},
badgeTextPremium: {
  color: '#A855F7',
}
```

## Testing Colors

### Visual Test Checklist
- [ ] Colors visible on dark background
- [ ] Colors visible on light background (if applicable)
- [ ] Text readable on colored backgrounds
- [ ] Borders clearly visible
- [ ] Works with system dark mode
- [ ] Works with system light mode

### Accessibility Test Checklist
- [ ] Test with grayscale filter
- [ ] Test with protanopia simulation (red-blind)
- [ ] Test with deuteranopia simulation (green-blind)
- [ ] Test with tritanopia simulation (blue-blind)
- [ ] Test with screen reader
- [ ] Test with VoiceOver/TalkBack

## Color Palette Source

Colors chosen from **Tailwind CSS v3 palette** for consistency:
- Blue-400: `#60A5FA`
- Green-400: `#4ADE80`
- Red-400: `#F87171`
- Amber-400: `#FBBF24`

This ensures:
- Professional, tested color choices
- Consistency with modern design systems
- Easy to remember and reference
- Well-documented accessibility

## Quick Copy-Paste

```typescript
// Generating (Blue)
backgroundColor: 'rgba(96, 165, 250, 0.2)'
borderColor: '#60A5FA'
color: '#60A5FA'

// Generated (Green)
backgroundColor: 'rgba(74, 222, 128, 0.2)'
borderColor: '#4ADE80'
color: '#4ADE80'
```
