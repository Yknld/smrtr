# Expo Dev Client Setup Status

## ✅ Completed

1. **Created project configuration**
   - ✅ `app.json` with iOS microphone permissions
   - ✅ `package.json` with Expo 50 dependencies
   - ✅ `babel.config.js` for react-native-dotenv
   - ✅ Bundle identifier: `com.studyos.mobile`

2. **Installed dependencies**
   - ✅ Base Expo packages (`expo`, `react`, `react-native`)
   - ✅ `expo-dev-client` for custom dev builds
   - ✅ `expo-av` for audio capture
   - ✅ `@supabase/supabase-js` for backend
   - ✅ `react-native-dotenv` for environment variables

3. **Generated native projects**
   - ✅ `npx expo prebuild --clean` succeeded
   - ✅ `ios/` and `android/` directories created
   - ✅ iOS Info.plist configured with microphone permissions:
     - `NSMicrophoneUsageDescription`: "We use the microphone to transcribe your speech in real time for study notes."
     - `NSSpeechRecognitionUsageDescription`: "We use speech recognition to provide accurate transcription for your study materials."

## ⚠️ Known Issue: CocoaPods boost Checksum

**Problem:** `pod install` fails with boost 1.83.0 checksum verification error.

**Error:**
```
Error installing boost
Verification checksum was incorrect, expected 6478edfe..., got 1c162b579...
```

**Root Cause:** This is a known issue with React Native 0.73.0 and boost 1.83.0 downloads from certain mirrors.

## 🔧 Workarounds (Choose One)

### Option 1: Skip Checksum Verification (Fastest)
```bash
cd apps/mobile/ios
pod install --skip-validation

# If that doesn't work, try:
pod install --no-repo-update --skip-validation
```

### Option 2: Manually Download Correct Boost
```bash
# Remove cached boost
rm -rf ~/Library/Caches/CocoaPods/Pods/External/boost

# Install with fresh download
cd apps/mobile/ios
pod install --repo-update
```

### Option 3: Use Xcode Directly
```bash
# Open Xcode project
open apps/mobile/ios/StudyOS.xcworkspace

# In Xcode:
# 1. Product → Clean Build Folder (Shift+Cmd+K)
# 2. Product → Build (Cmd+B)
# Xcode may handle pod dependencies better
```

### Option 4: Try Bundle Install (Alternative)
```bash
cd apps/mobile/ios
gem install cocoapods
bundle exec pod install
```

### Option 5: Update React Native (If Above Fail)
```bash
cd apps/mobile
npm install react-native@0.73.6
npx expo prebuild --clean
cd ios && pod install
```

## 📋 Next Steps After Fixing boost

### 1. Complete CocoaPods Installation
```bash
cd apps/mobile/ios
pod install  # Should succeed after workaround
```

### 2. Build iOS Dev Client
```bash
cd apps/mobile
npx expo run:ios
```

This will:
- Compile the native iOS app
- Install it on the iOS simulator
- Launch the app

### 3. Start Metro Bundler
In a separate terminal:
```bash
cd apps/mobile
npx expo start --dev-client
```

### 4. Create .env File
```bash
cd apps/mobile
cat > .env << 'EOF'
SUPABASE_URL=https://euxfugfzmpsemkjpcpuz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI
NODE_ENV=development
EOF
```

### 5. Create Supabase Client
Create `apps/mobile/src/data/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

export const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || ''
);
```

### 6. Create TypeScript Declaration for @env
Create `apps/mobile/src/env.d.ts`:
```typescript
declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const NODE_ENV: string;
}
```

## 🎯 Current Project Structure

```
apps/mobile/
├── app.json                    ✅ Created
├── package.json                ✅ Created
├── babel.config.js             ✅ Created
├── .env                        ⏳ Create manually
├── ios/                        ✅ Generated
│   ├── StudyOS.xcworkspace
│   ├── StudyOS.xcodeproj
│   ├── Podfile
│   └── Pods/                   ⚠️  boost issue
├── android/                    ✅ Generated
├── src/
│   ├── services/
│   │   └── geminiLive.ts       ✅ Complete
│   ├── screens/
│   │   └── LiveTranscription/
│   │       └── LiveTranscriptionScreen.tsx  ✅ Complete
│   ├── data/
│   │   └── supabase.ts         ⏳ Create after .env
│   └── env.d.ts                ⏳ Create for TypeScript
└── docs/
    └── gemini-live.md          ✅ Complete
```

## 🚀 Quick Commands Summary

```bash
# After fixing boost issue:

# 1. Build iOS app
cd /Users/danielntumba/smrtr/study-os-mobile/apps/mobile
npx expo run:ios

# 2. Start dev server (separate terminal)
npx expo start --dev-client

# 3. Run on physical device (after USB connection)
npx expo run:ios --device

# 4. Clean build if needed
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios
```

## 📚 References

- [Expo Dev Client Docs](https://docs.expo.dev/develop/development-builds/introduction/)
- [React Native 0.73 boost issue](https://github.com/facebook/react-native/issues/40214)
- [CocoaPods Troubleshooting](https://guides.cocoapods.org/using/troubleshooting.html)

## 💡 Recommendation

**Try Option 1 first** (skip checksum validation) as it's the fastest and boost checksum issues are typically false positives from CDN caching.

If you get past the boost issue, the rest of the setup should work smoothly!
