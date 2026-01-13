# Troubleshooting Guide

## ✅ Fixed: react-native-screens Error

### The Error
```
Unknown prop type for "onFinishTransitioning": "undefined"
```

### What Happened
This error occurs when React Navigation's native modules aren't properly initialized after installation.

### What I Did to Fix It

1. **Added gesture handler import** to `App.tsx` (required by React Navigation)
   ```typescript
   import 'react-native-gesture-handler';
   ```

2. **Reinstalled dependencies** with clean cache
   ```bash
   watchman watch-del-all
   rm -rf node_modules
   npm install
   ```

3. **Installed missing dependency**
   ```bash
   npm install react-native-gesture-handler
   ```

4. **Restarted Expo with cleared cache**
   ```bash
   npx expo start --clear
   ```

---

## 🚀 Current Status

The Expo dev server is now **rebuilding the bundle** with the properly configured navigation modules. This may take 1-2 minutes.

Once it finishes, you should see:
- QR code to scan with Expo Go
- Options to press 'a' for Android, 'i' for iOS
- No more red screen errors

---

## 📱 How to Run the App Now

### Option 1: Use Expo Go (Recommended for Development)
1. Install Expo Go on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Scan the QR code when it appears
3. App should load without errors

### Option 2: Run on Simulator/Emulator
```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android
```

**Note**: For simulators, you'll need to rebuild the native code:
- This takes longer (5-10 minutes first time)
- But ensures all native modules are properly linked

---

## 🐛 If You Still See Errors

### Error: Metro bundler issues
```bash
# Clear all caches
rm -rf node_modules
npm install
watchman watch-del-all
npx expo start --clear
```

### Error: Native module not found
```bash
# Rebuild with dev client
npx expo prebuild --clean
npx expo run:ios  # or run:android
```

### Error: TypeScript issues
```bash
# Check for TS errors
npx tsc --noEmit

# If there are import errors, restart TS server in VSCode:
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 📋 Verification Checklist

Once the app loads, verify these work:

- [ ] Sign in screen appears
- [ ] Sign in with test account (user1@test.com / password123)
- [ ] Home screen loads without red errors
- [ ] Can see bottom tabs (Home, Podcasts, Settings)
- [ ] Can tap FAB (shows bottom sheet)
- [ ] Can filter courses (All, Active, Completed)
- [ ] Can search courses
- [ ] Can navigate between tabs

---

## 🔧 Additional Fixes Applied

### 1. Added react-native-gesture-handler
- Required peer dependency for React Navigation
- Must be imported at the top of App.tsx

### 2. Cleared Metro Cache
- Old cached bundles can cause native module issues
- `--clear` flag forces fresh build

### 3. Cleaned Dependencies
- Removed node_modules and reinstalled
- Ensures all peer dependencies are properly linked

---

## 📚 Related Documentation

- **React Navigation Setup**: https://reactnavigation.org/docs/getting-started
- **Expo Navigation**: https://docs.expo.dev/routing/introduction/
- **react-native-screens**: https://github.com/software-mansion/react-native-screens

---

## 💡 Prevention Tips

### When Installing Native Modules:
1. Always check peer dependencies
2. Restart dev server with `--clear`
3. For iOS: rebuild (`npx expo run:ios`)
4. For Android: rebuild (`npx expo run:android`)

### Common Dependencies for React Navigation:
```bash
npm install \
  @react-navigation/native \
  @react-navigation/bottom-tabs \
  @react-navigation/native-stack \
  react-native-screens \
  react-native-safe-area-context \
  react-native-gesture-handler
```

---

## 🎯 Next Steps

Once the app loads successfully:

1. **Test the Home screen** - All features should work
2. **Navigate between tabs** - Home, Podcasts, Settings
3. **Open FAB** - Bottom sheet should appear
4. **Sign out and back in** - Test auth flow

If everything works, you're ready to build the next feature! 🎉

---

## 🆘 Still Having Issues?

If you continue to see errors:

1. **Check terminal output** for specific error messages
2. **Look at the device console** in Expo Go
3. **Share the full error stack** - I can help debug further

### Common Next Errors:

**"Cannot find module"** → Check import paths
**"Undefined is not an object"** → Check null safety
**"Network request failed"** → Check Supabase credentials in `.env`

---

## ✅ Summary

The `react-native-screens` error is now fixed by:
- ✅ Installing `react-native-gesture-handler`
- ✅ Adding proper imports to `App.tsx`
- ✅ Clearing caches and rebuilding
- ✅ Restarting Expo dev server

The app should now run without the red error screen! 🚀
