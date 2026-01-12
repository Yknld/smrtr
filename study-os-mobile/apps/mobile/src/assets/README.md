# Assets

This directory contains static assets like images, icons, and fonts.

## Purpose

Store and organize all static files used in the mobile app.

---

## Structure

```
assets/
├── images/       # PNG, JPG, WebP files
├── icons/        # SVG files or icon sets
├── fonts/        # Custom font files
└── README.md     # This file
```

---

## Images

Place raster images in `images/` directory:

- **Formats**: PNG (transparency), JPG (photos), WebP (optimized)
- **Naming**: `kebab-case.png` (e.g., `empty-state-illustration.png`)
- **Optimization**: Compress images before adding (use TinyPNG, ImageOptim)
- **Resolution**: Provide @2x and @3x variants for iOS (e.g., `logo@2x.png`, `logo@3x.png`)

Example:
```
images/
├── logo.png
├── logo@2x.png
├── logo@3x.png
├── empty-state-notes.png
└── splash-screen.png
```

---

## Icons

Place icon files in `icons/` directory:

- **Formats**: SVG (vector, preferred) or icon fonts
- **Library**: Consider using a library like `react-native-vector-icons` or `@expo/vector-icons`
- **Custom icons**: Add as SVG files

Example:
```
icons/
├── book.svg
├── note.svg
├── play.svg
└── pause.svg
```

---

## Fonts

Place custom font files in `fonts/` directory:

- **Formats**: TTF, OTF
- **Weights**: Include all needed weights (Regular, Medium, Semibold, Bold)
- **Licensing**: Ensure fonts are licensed for app use

Example:
```
fonts/
├── CustomFont-Regular.ttf
├── CustomFont-Medium.ttf
├── CustomFont-Semibold.ttf
└── CustomFont-Bold.ttf
```

---

## Usage in App

### Images

```typescript
import { Image } from 'react-native';

<Image
  source={require('@/assets/images/logo.png')}
  style={{ width: 100, height: 100 }}
/>
```

### Icons (with react-native-svg)

```typescript
import { SvgXml } from 'react-native-svg';
import BookIcon from '@/assets/icons/book.svg';

<BookIcon width={24} height={24} />
```

### Fonts (with React Native)

```typescript
// Load fonts on app start
import * as Font from 'expo-font';

await Font.loadAsync({
  'CustomFont-Regular': require('@/assets/fonts/CustomFont-Regular.ttf'),
  'CustomFont-Bold': require('@/assets/fonts/CustomFont-Bold.ttf'),
});

// Use in styles
<Text style={{ fontFamily: 'CustomFont-Regular' }}>Hello</Text>
```

---

## Best Practices

1. **Optimize assets** - Compress images, use vector formats when possible
2. **Consistent naming** - Use kebab-case for all files
3. **Version control** - Don't commit huge files, use Git LFS if needed
4. **Attribution** - Document source and license for third-party assets
5. **Platform-specific** - Use platform-specific variants if needed (e.g., iOS vs Android icons)

---

## Icon Libraries

Instead of custom icons, consider using icon libraries:

- **Feather Icons**: Clean, minimal outline icons
- **Heroicons**: Modern SVG icons
- **Ionicons**: Comprehensive icon set for mobile

Install:
```bash
npm install react-native-vector-icons
```

Usage:
```typescript
import Icon from 'react-native-vector-icons/Feather';

<Icon name="book" size={24} color="#000" />
```

---

## Future Assets

- Splash screen images
- App icon (iOS and Android variants)
- Illustrations for empty/error states
- Tutorial/onboarding graphics
- Background patterns
