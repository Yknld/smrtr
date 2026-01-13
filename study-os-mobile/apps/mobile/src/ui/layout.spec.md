# Layout Specification

This file defines layout patterns, spacing rules, and responsive guidelines.

---

## Screen Layout

### Container Padding
| Area | Value | Token |
|------|-------|-------|
| Horizontal (left/right) | 16px | `spacing.md` |
| Top | 24px | `spacing.lg` |
| Bottom | 16px | `spacing.md` |

**Implementation**:
```typescript
container: {
  paddingHorizontal: spacing.md,  // 16px
  paddingTop: spacing.lg,          // 24px
  paddingBottom: spacing.md,       // 16px
}
```

---

## Safe Area

Use React Native's `SafeAreaView` to respect device notches and system UI:

```typescript
<SafeAreaView style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={styles.container}>
    {/* Screen content */}
  </ScrollView>
</SafeAreaView>
```

---

## Section Spacing

| Element | Gap | Token |
|---------|-----|-------|
| Between cards in list | 16px | `spacing.md` |
| Between screen sections | 24px | `spacing.lg` |
| Between header and content | 24px | `spacing.lg` |
| Between heading and list | 12px | `spacing.sm + xs` |

---

## Card Layouts

### Single Card
```
Card dimensions:
- Padding: 16px (all sides)
- Rounded: 12px
- Min height: Auto (content-based)
- Max width: Screen width - 32px (16px padding each side)
```

### Card List (Vertical)
```
Layout:
- Direction: Column
- Gap: 16px between cards
- Scroll: Vertical
- Padding: 16px horizontal, 24px top

Example:
┌─────────────────┐
│ Card 1          │
├─────────────────┤ ← 16px gap
│ Card 2          │
├─────────────────┤ ← 16px gap
│ Card 3          │
└─────────────────┘
```

**Implementation**:
```typescript
listContainer: {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
  gap: spacing.md,  // or use marginBottom on each card
}
```

### Card Grid (2 Columns)
```
Layout:
- Columns: 2
- Column gap: 16px
- Row gap: 16px
- Card width: (Screen width - 48px) / 2
  // 48px = 16px left + 16px right + 16px gap

Example:
┌──────────┬──────────┐
│ Card 1   │ Card 2   │
├──────────┼──────────┤
│ Card 3   │ Card 4   │
└──────────┴──────────┘
```

**Implementation**:
```typescript
gridContainer: {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: spacing.md,
},
gridCard: {
  width: (screenWidth - 48) / 2,
}
```

---

## Header Layout

### Screen Header
```
Height: 60px (iOS), 56px (Android)
Padding: 16px horizontal
Background: White

Layout:
┌────────────────────────────────┐
│ [Back] Screen Title      [Icon]│ ← 60px height
└────────────────────────────────┘

Elements:
- Back button: 44x44px touch target (left)
- Title: Heading 1, centered or left-aligned
- Action icon: 44x44px touch target (right, optional)
```

---

## Content Area

### Scrollable Content
```
Use ScrollView or FlatList for scrollable content:

<ScrollView
  contentContainerStyle={{
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,  // Extra bottom padding
  }}
>
  {/* Content */}
</ScrollView>
```

### Fixed Content
```
Use View for non-scrollable content (centered states):

<View style={{
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: spacing.md,
}}>
  <EmptyState />
</View>
```

---

## Touch Targets

Minimum touch target sizes for accessibility:

| Element | Min Size | Recommended |
|---------|----------|-------------|
| Button | 44x44px | 48x48px |
| Icon button | 44x44px | 48x48px |
| Card (tappable) | 44px height | 60px+ height |
| Pill (tappable) | 32px height | 36px height |

**Implementation**:
```typescript
button: {
  minHeight: 44,
  minWidth: 44,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: spacing.lg,
}
```

---

## Spacing Patterns

### Inside Card
```
Card padding: 16px (all sides)

Content spacing:
┌──────────────────────┐
│ [16px padding]       │
│  ┌────────────────┐  │
│  │ Heading        │  │
│  │                │  │ ← 8px gap
│  │ Subtitle       │  │
│  │                │  │ ← 12px gap
│  │ [Action]       │  │
│  └────────────────┘  │
│ [16px padding]       │
└──────────────────────┘
```

### Between Sections
```
Screen sections:
┌─────────────────────┐
│ Recently Studied    │
│ [Cards...]          │
└─────────────────────┘
         ↕ 24px gap
┌─────────────────────┐
│ Your Classes        │
│ [Cards...]          │
└─────────────────────┘
```

---

## Responsive Guidelines

### Phone (Default)
- Single column layout
- Screen padding: 16px
- Card grid: 2 columns max

### Tablet (Future)
- Two column layout (master-detail)
- Screen padding: 24px
- Card grid: 3-4 columns

### Breakpoints (Future)
```typescript
const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};
```

---

## List Layouts

### FlatList (Recommended for long lists)
```typescript
<FlatList
  data={classes}
  renderItem={({ item }) => <ClassCard class={item} />}
  contentContainerStyle={{
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  }}
  ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
  keyExtractor={(item) => item.id}
/>
```

### ScrollView (For shorter lists)
```typescript
<ScrollView
  contentContainerStyle={{
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,  // Requires React Native 0.71+
  }}
>
  {classes.map(cls => <ClassCard key={cls.id} class={cls} />)}
</ScrollView>
```

---

## Z-Index Layers

Define z-index values for layering:

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Default content |
| Card | 1 | Elevated cards |
| Header | 10 | Fixed headers |
| Overlay | 100 | Modals, overlays |
| Toast | 200 | Notifications |

---

## Animation Guidelines

### Transitions
- Screen transitions: 300ms ease-in-out
- Card press: 150ms ease-out (scale 0.98)
- Fade in/out: 200ms

### Timings
```typescript
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
};
```

---

## Accessibility

### Focus Indicators
```typescript
focusIndicator: {
  borderWidth: 2,
  borderColor: colors.primary,
  borderRadius: radii.md,
}
```

### Screen Reader
- Use proper heading hierarchy (h1 → h2 → h3)
- Provide accessible labels for icons
- Announce loading/error states

---

## Platform-Specific Adjustments

### iOS
- Use `SafeAreaView` for notch/home indicator
- Consider larger header height (60px)
- Bouncy scroll behavior (default)

### Android
- Use `StatusBar` component for status bar styling
- Consider Material Design guidelines
- No bounce scroll (default)

---

## Best Practices

1. **Consistent spacing** - Use tokens, not hardcoded values
2. **Respect safe areas** - Always use SafeAreaView
3. **Touch targets** - Minimum 44x44px for all interactive elements
4. **Scroll containers** - Use FlatList for long lists, ScrollView for short content
5. **Flex layout** - Use flexbox for responsive layouts
6. **Test on devices** - Layouts render differently on various screen sizes
