# Components

This directory contains reusable UI building blocks used across multiple screens.

## Component Conventions

### When to Create a Component

Create a new component when:
- UI pattern is used in 2+ screens
- Complex UI clutters screen code
- Element has clear single responsibility
- Logic can be isolated and tested

### When NOT to Create a Component

Skip component creation when:
- UI is one-off (used in single screen only)
- Markup is trivial (2-3 lines)
- Logic is tightly coupled to screen context

---

## Component Structure

Each component should live in its own folder:

```
ComponentName/
├── ComponentName.tsx           # Main component file
├── ComponentName.types.ts      # Props and local types
├── ComponentName.styles.ts     # Styled components (if using)
└── ComponentName.test.ts       # Unit tests
```

For MVP, use `.placeholder.md` files to mark component boundaries.

---

## Component Rules

### Components MUST:
- Accept all data via props
- Be reusable across screens
- Handle their own local state (hover, press, focus)
- Emit events via callback props
- Use design tokens from `ui/` directory
- Be composable (can contain other components)

### Components MUST NOT:
- Navigate to other screens (emit events instead)
- Fetch data or make API calls
- Access global state directly (receive via props)
- Contain business logic
- Hardcode design values (use tokens)

---

## Existing Components (Planned)

### Layout Components

- **Card** - Rounded container with shadow
- **Pill** - Rounded badge/chip for tags

### State Components

- **LoadingState** - Skeleton loaders
- **EmptyState** - No data display
- **ErrorState** - Error message with retry (future)

### Action Components

- **Button** - Primary, secondary, text variants (future)
- **IconButton** - Icon-only button (future)

---

## Props Naming Conventions

- **Event handlers**: `onEventName` (e.g., `onPress`, `onChange`)
- **Boolean flags**: `isState` or `hasState` (e.g., `isDisabled`, `hasError`)
- **Content**: `children` for nested content, specific names for slots
- **Styling**: `variant`, `size`, `style` (override styles)

---

## Example Component Interface

```typescript
interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'disabled';
  style?: ViewStyle;
}
```

---

## Testing Strategy

- **Unit tests**: Test props, rendering, interactions
- **Snapshot tests**: Ensure UI consistency
- **Accessibility tests**: Check labels, focus, contrast

---

## Styling Approach

Components should:
1. Import tokens from `ui/` directory
2. Apply tokens via StyleSheet or styled-components
3. Allow style overrides via `style` prop
4. Support variants via `variant` prop

---

## Accessibility

All components must:
- Provide accessible labels (accessibility props)
- Support keyboard navigation (future, for web)
- Meet contrast ratios (use tokens)
- Have appropriate touch targets (44x44px minimum)

---

## Future Components (Not in MVP)

- Input fields (text, number)
- Modals/overlays
- Tabs/navigation bars
- Progress indicators
- Toast notifications
- Date/time pickers
