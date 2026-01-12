# Quick Reference Guide

## TL;DR Integration

### 1. Install Dependencies
```bash
npm install @notifee/react-native
cd ios && pod install && cd ..
```

### 2. Add Native Files to Xcode
- Drag `ScreenTimeModule.swift` and `ScreenTimeModule.m` into your Xcode project
- Ensure "Copy items if needed" is checked

### 3. Add Capability
In Xcode: Target → Signing & Capabilities → Add "Family Controls"

### 4. Update Info.plist
```xml
<key>NSFamilyControlsUsageDescription</key>
<string>Monitor screen time during focus sessions</string>
```

### 5. Use in React Native
```javascript
import FocusSessionManager from './FocusSessionManager';

// Start session
await FocusSessionManager.startFocusSession({
  sessionName: 'Study Time',
  durationMinutes: 60,
  usageLimit: 15,
  blockedApps: ['com.zhiliaoapp.musically', 'com.burbn.instagram'],
});

// End session
await FocusSessionManager.endFocusSession();
```

---

## Common App Bundle IDs

```javascript
const APPS = {
  tiktok: 'com.zhiliaoapp.musically',
  instagram: 'com.burbn.instagram',
  twitter: 'com.twitter.twitter',
  facebook: 'com.facebook.Facebook',
  snapchat: 'com.toyopagroup.picaboo',
  reddit: 'com.reddit.Reddit',
  youtube: 'com.google.ios.youtube',
};
```

---

## API Cheat Sheet

### Authorization
```javascript
// Check status
const { isAuthorized } = await ScreenTimeModule.checkAuthorizationStatus();

// Request permission
await ScreenTimeModule.requestAuthorization();
```

### Sessions
```javascript
// Start
await FocusSessionManager.startFocusSession(config);

// End
await FocusSessionManager.endFocusSession();

// Check if active
FocusSessionManager.isSessionActive(); // boolean

// Get current
const session = FocusSessionManager.getCurrentSession();
```

### Notifications
```javascript
// Daily reminder at 9 AM
await FocusSessionManager.scheduleDailyReminder(9, 0);

// Manual notification
await FocusSessionManager.showNotification({
  title: 'Focus Time',
  body: 'Time to concentrate',
});
```

### Native Module Direct Access
```javascript
import { NativeModules } from 'react-native';
const { ScreenTimeModule } = NativeModules;

// Get usage
await ScreenTimeModule.getScreenUsage(
  ['com.zhiliaoapp.musically'],
  startTime,
  endTime
);

// Block apps
await ScreenTimeModule.blockApps(['com.burbn.instagram']);

// Unblock all
await ScreenTimeModule.unblockApps();

// Start monitoring
await ScreenTimeModule.startMonitoring(
  ['com.zhiliaoapp.musically'],
  30 // threshold minutes
);

// Stop monitoring
await ScreenTimeModule.stopMonitoring();
```

---

## Common Issues

### Module not found
```bash
# Clean and rebuild
cd ios
rm -rf build/
cd ..
npx react-native run-ios
```

### Authorization failing
- Must test on real device (not simulator)
- Requires Family Controls capability
- Must be signed with Apple Developer account

### Notifications not showing
```javascript
// Request permissions first
await FocusSessionManager.requestNotificationPermissions();
```

---

## Minimal Example Component

```javascript
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import FocusSessionManager from './FocusSessionManager';

export default function MinimalExample() {
  const [active, setActive] = useState(false);

  const toggle = async () => {
    try {
      if (active) {
        await FocusSessionManager.endFocusSession();
        setActive(false);
      } else {
        await FocusSessionManager.initialize();
        await FocusSessionManager.startFocusSession({
          sessionName: 'Focus',
          durationMinutes: 25,
          usageLimit: 5,
          blockedApps: ['com.zhiliaoapp.musically'],
        });
        setActive(true);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Button
        title={active ? 'End Session' : 'Start Session'}
        onPress={toggle}
      />
    </View>
  );
}
```

---

## File Checklist

### iOS Native Files (add to Xcode)
- [ ] `ScreenTimeModule.swift`
- [ ] `ScreenTimeModule.m`

### React Native Files (add to src/)
- [ ] `FocusSessionManager.js`
- [ ] `FocusSessionScreen.jsx` (optional, pre-built UI)

### Configuration
- [ ] Add Family Controls capability in Xcode
- [ ] Add usage description to Info.plist
- [ ] Install @notifee/react-native
- [ ] Run pod install

### Testing
- [ ] Test on real iOS device
- [ ] Request authorization
- [ ] Start/stop session
- [ ] Check notifications appear

---

## Build Settings Reference

### Required iOS Version
- **Minimum:** iOS 15.0
- **Recommended:** iOS 16.0+ (for full API)

### Required Capabilities
- Family Controls

### Required Frameworks
- FamilyControls
- DeviceActivity
- ManagedSettings

### Pod Dependencies
```ruby
pod 'notifee', :path => '../node_modules/@notifee/react-native'
```

---

## Support Links

- [Apple FamilyControls Docs](https://developer.apple.com/documentation/familycontrols)
- [Notifee Docs](https://notifee.app/react-native/docs/overview)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-ios)

---

## Pro Tips

1. **Test Early**: Screen Time only works on real devices with proper provisioning
2. **User Onboarding**: Clearly explain why you need Screen Time access
3. **Graceful Degradation**: Handle authorization denial gracefully
4. **Battery Awareness**: Inform users about background monitoring
5. **Privacy First**: Never export or share Screen Time data
6. **Clear UI**: Show session status prominently
7. **Easy Exit**: Always allow users to end sessions early
8. **Positive Reinforcement**: Celebrate session completion

---

## Quick Debug Commands

```bash
# View device logs
xcrun simctl spawn booted log stream --predicate 'subsystem contains "com.yourapp"'

# Clear app data
xcrun simctl uninstall booted com.yourcompany.yourapp

# Rebuild from scratch
watchman watch-del-all
rm -rf node_modules
npm install
cd ios
rm -rf build Pods
pod install
cd ..
npx react-native run-ios
```

---

## Session Configuration Presets

```javascript
// Pomodoro (25 min)
const POMODORO = {
  sessionName: 'Pomodoro',
  durationMinutes: 25,
  usageLimit: 0,
  blockedApps: ALL_SOCIAL_APPS,
};

// Deep Work (2 hours)
const DEEP_WORK = {
  sessionName: 'Deep Work',
  durationMinutes: 120,
  usageLimit: 10,
  blockedApps: ALL_SOCIAL_APPS,
};

// Study Session (1 hour)
const STUDY = {
  sessionName: 'Study Session',
  durationMinutes: 60,
  usageLimit: 15,
  blockedApps: ['com.zhiliaoapp.musically', 'com.burbn.instagram'],
};
```

---

## Performance Notes

- ✅ Monitoring is battery-efficient (uses iOS native APIs)
- ✅ Sessions continue when app is backgrounded
- ✅ Notifications work even if app is closed
- ❌ Usage data requires DeviceActivityReport extension for accuracy
- ❌ App blocking requires user to select apps via FamilyActivityPicker
