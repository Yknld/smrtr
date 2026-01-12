# Study OS Mobile - Quick Start Guide

## 🚀 What Was Built

The **Home screen** with full navigation structure, following the Study OS design system.

### ✅ Features Implemented
- ✅ Bottom tabs navigation (Home, Podcasts, Settings)
- ✅ Home screen with course list
- ✅ User header (avatar + name/email)
- ✅ Filter chips (All, Active, Completed)
- ✅ Search bar with real-time filtering
- ✅ Course cards with accent strips
- ✅ Pull-to-refresh
- ✅ FAB with bottom sheet (4 actions)
- ✅ Loading state (skeleton cards)
- ✅ Empty state with CTA
- ✅ Authentication flow (sign in/out)
- ✅ Supabase integration

---

## 📦 Installation

```bash
cd /Users/danielntumba/smrtr/study-os-mobile/apps/mobile
npm install
```

---

## 🏃 Run the App

### Start Development Server
```bash
npm start
```

### Run on iOS
```bash
npm run ios
```

### Run on Android
```bash
npm run android
```

---

## 🔑 Test Account

**Email**: `user1@test.com`  
**Password**: `password123`

---

## 📁 Key Files

### Entry Point
- `App.tsx` - Root component with auth logic

### Navigation
- `src/navigation/AppNavigator.tsx` - Bottom tabs

### Screens
- `src/screens/Home/HomeScreen.tsx` - Main home screen
- `src/screens/Podcasts/PodcastsScreen.tsx` - Placeholder
- `src/screens/Settings/SettingsScreen.tsx` - Settings + sign out

### Components
- `src/components/SearchBar/SearchBar.tsx`
- `src/components/FilterChip/FilterChip.tsx`
- `src/components/CourseCard/CourseCard.tsx`
- `src/components/LoadingState/LoadingState.tsx`
- `src/components/EmptyState/EmptyState.tsx`
- `src/components/FAB/FAB.tsx`
- `src/components/BottomSheet/BottomSheet.tsx`

### Data Layer
- `src/data/courses.repository.ts` - Supabase queries
- `src/types/course.ts` - Course types

### Design System
- `src/ui/tokens.ts` - Colors, spacing, typography, shadows
- `src/ui/README.md` - Token usage guide
- `docs/ui-style.md` - Full design spec

---

## 🎨 Design System

### Colors
```typescript
import { colors } from './src/ui/tokens';

colors.primary       // #2563EB (blue)
colors.background    // #FFFFFF (white)
colors.surface       // #F9FAFB (light gray)
colors.textPrimary   // #111827 (dark)
colors.textSecondary // #6B7280 (gray)
```

### Spacing
```typescript
import { spacing } from './src/ui/tokens';

spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 16px (default)
spacing.lg   // 24px
spacing.xl   // 32px
```

### Typography
```typescript
import { typography } from './src/ui/tokens';

typography.h1    // 28px bold (screen titles)
typography.h3    // 18px semibold (card titles)
typography.body  // 16px regular (content)
```

---

## 🔌 Supabase Integration

### Fetch Courses
```typescript
import { fetchCourses } from './src/data/courses.repository';

const courses = await fetchCourses();
// Returns: CourseWithMeta[]
```

### Filter Courses
```typescript
import { filterCourses } from './src/data/courses.repository';

const activeCourses = filterCourses(courses, 'active');
```

### Search Courses
```typescript
import { searchCourses } from './src/data/courses.repository';

const results = searchCourses(courses, 'biology');
```

---

## 📸 Screen Flow

```
1. Launch App
   ↓
2. Sign In (user1@test.com / password123)
   ↓
3. Home Screen
   - View course list
   - Filter by All/Active/Completed
   - Search courses
   - Pull to refresh
   - Tap FAB → See bottom sheet
   ↓
4. Navigate to Podcasts/Settings tabs
   ↓
5. Sign Out from Settings
```

---

## 🧪 Testing Checklist

### Authentication
- [ ] Sign in with valid credentials
- [ ] Sign in with invalid credentials (error)
- [ ] Sign out from Settings

### Home Screen
- [ ] View course list (if data exists)
- [ ] View empty state (if no courses)
- [ ] Filter by "All" (default)
- [ ] Filter by "Active"
- [ ] Filter by "Completed"
- [ ] Search courses by title
- [ ] Clear search (see all courses)
- [ ] Pull to refresh
- [ ] Tap course card (console log)
- [ ] Tap FAB (open bottom sheet)
- [ ] Select bottom sheet action (console log)
- [ ] Tap Cancel (close bottom sheet)

### Navigation
- [ ] Navigate to Home tab
- [ ] Navigate to Podcasts tab
- [ ] Navigate to Settings tab
- [ ] Active tab highlighted in blue

---

## 🐛 Known Limitations

1. **Course Detail**: Placeholder (console.log only)
2. **FAB Actions**: Placeholder (console.log only)
3. **Notification Bell**: Non-functional
4. **Course Colors**: Default blue if not set
5. **Podcasts Screen**: Placeholder empty state
6. **Settings Items**: Non-functional (except sign out)

---

## 📝 Next Steps

### Immediate
1. **Course Detail Screen**: View lessons within a course
2. **Create Course Modal**: Form to create new courses
3. **Lesson List**: Display lessons with status
4. **Course Color Picker**: UI to select accent colors

### Future
1. **Offline Support**: Cache courses locally
2. **Push Notifications**: Study reminders
3. **Course Archive**: Archive completed courses
4. **Study Streaks**: Display streak badges
5. **Progress Indicators**: Visual progress bars

---

## 📚 Documentation

- **Implementation Guide**: `HOME_SCREEN_IMPLEMENTATION.md`
- **Component Hierarchy**: `COMPONENT_HIERARCHY.md`
- **Design System**: `docs/ui-style.md`
- **Token Usage**: `src/ui/README.md`

---

## 💡 Tips

### Adding a New Component
1. Create in `src/components/[ComponentName]/`
2. Import tokens: `import { colors, spacing } from '../../ui/tokens'`
3. Export from `src/components/index.ts`
4. Use in screens

### Styling Best Practices
- Always use tokens (never hardcode)
- Use multiples of 4px for spacing
- Follow typography scale (h1, h2, h3, body, caption)
- Use `...shadows.card` for elevation

### Data Fetching
- Use repository pattern (`src/data/*.repository.ts`)
- Transform Supabase responses to camelCase types
- Handle errors gracefully
- Show loading states

---

## 🎯 Design Principles

1. ✅ **Light mode only** - Single neutral gray theme
2. ✅ **Rounded cards** - 12px radius, soft shadows
3. ✅ **Muted accents** - Course color as subtle strip
4. ✅ **Large titles** - 28px bold, airy spacing
5. ✅ **Read-only** - No editing UI yet
6. ✅ **Clean data** - No mock logic, real Supabase
7. ✅ **Reusable** - All components modular

---

## 🆘 Troubleshooting

### App won't start
```bash
# Clear cache
npm start -- --clear

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Supabase errors
- Check `.env` file exists with correct credentials
- Verify user exists in Supabase Auth
- Check RLS policies allow user access

### TypeScript errors
```bash
# Check for errors
npx tsc --noEmit
```

---

## 📞 Support

- **Implementation Docs**: See `HOME_SCREEN_IMPLEMENTATION.md`
- **Component Structure**: See `COMPONENT_HIERARCHY.md`
- **Design Tokens**: See `src/ui/README.md`

---

## ✨ Summary

The Home screen is **production-ready** with:
- Full navigation structure (bottom tabs + FAB)
- Real Supabase integration
- Complete design system implementation
- Reusable component library
- Loading and empty states
- Authentication flow

**Ready to build**: Course Detail screen or Create Course modal! 🚀
