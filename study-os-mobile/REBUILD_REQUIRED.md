# Mobile App Rebuild Required

## Why You Don't See the UI Changes

The generation states UI (Generate → Generating → Generated) was implemented in the **source code**, but the mobile app needs to be **rebuilt** to see these changes.

## What Changed (In Code)

### Files Modified:
1. **ActionTile.tsx** - Added blue "GENERATING" and green "GENERATED" badge styles
2. **LessonHubScreen.tsx** - Added:
   - Real-time data fetching from database
   - State management for processing/generated content
   - Realtime subscriptions for automatic updates
   - Helper function to determine badge states

## How to See the Changes

### Option 1: Rebuild via npm (In Progress)

The build was started with:
```bash
cd study-os-mobile/apps/mobile
npm run ios
```

This will:
1. Recompile the TypeScript code
2. Bundle the JavaScript
3. Rebuild the iOS app
4. Launch in simulator

**Expected time**: 2-5 minutes

### Option 2: Rebuild via Expo CLI

```bash
cd study-os-mobile/apps/mobile
npx expo start --clear
# Then press 'i' for iOS simulator
```

### Option 3: Reload in Running App

If the app is already running, try:
1. Press `Cmd+D` in simulator
2. Select "Reload"
3. Or press `Cmd+R` to fast refresh

## What You'll See After Rebuild

### Before Tapping (Generate State)
```
┌─────────────────┐
│   GENERATE      │ ← Gray badge
│                 │
│      📹         │
│                 │
│     Video       │
│  30s explainer  │
└─────────────────┘
```

### After Tapping (Generating State)
```
┌─────────────────┐
│  GENERATING     │ ← Blue badge, blue border
│                 │
│      📹         │ ← Icon dimmed
│                 │
│     Video       │ ← Text dimmed
│  30s explainer  │
└─────────────────┘
(Card disabled, 50% opacity)
```

### After Complete (Generated State)
```
┌─────────────────┐
│   GENERATED     │ ← Green badge, green border
│                 │
│      📹         │ ← Icon normal
│                 │
│     Video       │ ← Text normal
│  30s explainer  │
└─────────────────┘
(Card enabled, tap to view)
```

## Checking Build Progress

Watch the terminal output to see:
- ✓ Bundling JavaScript
- ✓ Compiling TypeScript
- ✓ Building iOS app
- ✓ Launching simulator

## Troubleshooting

### Build Fails?

Try clearing cache:
```bash
cd study-os-mobile/apps/mobile
rm -rf node_modules
npm install
npm run ios
```

### Still Not Seeing Changes?

1. Make sure you're in the right lesson (Lesson 1)
2. Pull down to refresh the screen
3. Check that edge function is working (it is - we tested it)
4. Look at console logs in terminal for errors

### Want to Test Without Rebuild?

The backend is working - you can test the edge function directly:
```bash
./test_video_no_auth.sh
```

This will show video generation works, you just need the UI to reflect it.

## Summary

**Backend**: ✅ Working (auth disabled, video generation works)
**UI Code**: ✅ Written (badge states implemented)
**Running App**: ❌ Not rebuilt yet (needs `npm run ios`)

**Next Step**: Wait for the build to complete (check terminal output)
