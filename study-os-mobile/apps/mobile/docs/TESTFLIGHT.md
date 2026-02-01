# iOS build to TestFlight

## One-time setup

1. **Link the project to EAS** (run in your terminal; requires interactive input):

   ```bash
   cd apps/mobile
   eas init
   ```
   When prompted, confirm creating/linking the project for `@yktest1/study-os-mobile`. This writes `extra.eas.projectId` into `app.json`.

2. **Configure iOS credentials** (optional; EAS can manage them):

   ```bash
   eas credentials --platform ios --profile production
   ```
   Add or select an Apple distribution certificate and App Store provisioning profile. If you skip this, EAS will prompt during the first build.

## Build and submit to TestFlight

From `study-os-mobile/apps/mobile`:

```bash
# Build iOS for App Store / TestFlight (runs on EAS servers)
npm run build:ios:testflight
# or: eas build --platform ios --profile production
```

When the build finishes (check [expo.dev](https://expo.dev) or the build URL printed by EAS):

```bash
# Submit the latest build to TestFlight
npm run submit:ios:testflight
# or: eas submit --platform ios --latest
```

You’ll be prompted for Apple ID and optionally app-specific password and App Store Connect app ID if not already configured.

## Config

- **Build profile**: `eas.json` → `build.production` (store distribution, auto-increment build).
- **App**: `app.json` → `expo.ios.bundleIdentifier` = `com.studyos.mobile`.

To use a different EAS profile, pass `--profile <name>` to `eas build` and `eas submit`.

---

## If "Install dependencies" phase fails

1. **Check the full log** on [expo.dev](https://expo.dev) → your project → Builds → open the failed build → expand the "Install dependencies" step to see the exact error (e.g. `npm install`, `expo-doctor`, or `pod install`).

2. **Dependency alignment** (already applied once): Dependencies were aligned with Expo SDK 50 via `npx expo install --fix`. If you change Expo or add packages, run:
   ```bash
   npx expo install --check
   npx expo install --fix
   ```

3. **Regenerate iOS native project** after dependency changes:
   ```bash
   npx expo prebuild --platform ios --clean
   ```
   Let `pod install` finish. Commit the updated `ios/` and `package-lock.json` before running the EAS build again.

4. **EAS image**: Production iOS builds use `"image": "latest"` in `eas.json` so EAS uses a current macOS/Xcode image. If you hit image-specific errors, you can pin an image (e.g. `macos-sonoma-14.4-xcode-15.3`) in the `production.ios` section.
