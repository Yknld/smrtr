# Complete Setup Guide for iOS Screen Time Module

This guide walks you through integrating the Screen Time module into your existing React Native iOS app.

## Prerequisites

- React Native 0.64 or higher
- iOS deployment target 15.0 or higher (16.0+ recommended for full features)
- Xcode 14 or higher
- An active Apple Developer account

## Step-by-Step Setup

### 1. Install Node Dependencies

```bash
cd /path/to/your/react-native-app
npm install @notifee/react-native
# or
yarn add @notifee/react-native
```

### 2. Install iOS Pods

```bash
cd ios
pod install
cd ..
```

### 3. Add Native Files to Xcode

1. Open your project in Xcode:
   ```bash
   open ios/YourApp.xcworkspace
   ```

2. Right-click on your app folder in the Project Navigator
3. Select "Add Files to YourApp"
4. Navigate to the module folder and select:
   - `ScreenTimeModule.swift`
   - `ScreenTimeModule.m`
5. Ensure "Copy items if needed" is checked
6. Click "Add"

### 4. Configure Swift Bridging Header

If this is your first Swift file in the project:

1. Xcode will prompt: "Would you like to configure an Objective-C bridging header?"
2. Click "Create Bridging Header"
3. A file named `YourApp-Bridging-Header.h` will be created

If you already have a bridging header, no action needed.

### 5. Update Info.plist

Add these entries to `ios/YourApp/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Existing entries -->
    
    <!-- Add these new entries -->
    <key>NSFamilyControlsUsageDescription</key>
    <string>We monitor screen time to help you stay focused during study sessions</string>
    
    <key>NSUserTrackingUsageDescription</key>
    <string>We need permission to monitor screen time during focus sessions</string>
</dict>
</plist>
```

### 6. Add Family Controls Capability

1. In Xcode, select your project in the Project Navigator
2. Select your app target
3. Click the "Signing & Capabilities" tab
4. Click "+ Capability" button
5. Search for and add "Family Controls"

**Important:** You must be signed in with an Apple Developer account for this capability to work.

### 7. Update iOS Deployment Target

1. In Xcode, select your project
2. Under "Deployment Info", set "iOS Deployment Target" to 15.0 or higher

### 8. Add JavaScript Files

Copy these files to your React Native project:

```bash
# Create modules directory if it doesn't exist
mkdir -p src/modules

# Copy the files
cp ios-screentime-module/FocusSessionManager.js src/modules/
cp ios-screentime-module/FocusSessionScreen.jsx src/screens/
```

### 9. Update Your App Router

Add the FocusSessionScreen to your navigation:

**React Navigation Example:**

```javascript
import FocusSessionScreen from './screens/FocusSessionScreen';

// In your navigator
<Stack.Screen 
  name="FocusSession" 
  component={FocusSessionScreen}
  options={{ title: 'Focus Sessions' }}
/>
```

### 10. Test the Installation

Create a test component:

```javascript
import React, { useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { NativeModules } from 'react-native';

const { ScreenTimeModule } = NativeModules;

export default function ScreenTimeTest() {
  useEffect(() => {
    // Check if module is available
    console.log('ScreenTimeModule available:', ScreenTimeModule !== undefined);
  }, []);

  const testAuthorization = async () => {
    try {
      const status = await ScreenTimeModule.checkAuthorizationStatus();
      Alert.alert('Authorization Status', JSON.stringify(status, null, 2));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Screen Time Module Test
      </Text>
      <Button title="Check Authorization" onPress={testAuthorization} />
    </View>
  );
}
```

### 11. Build and Run

```bash
# Clean build folders
cd ios
rm -rf build/
cd ..

# Rebuild
npx react-native run-ios
```

## Verification Checklist

- [ ] App builds without errors
- [ ] ScreenTimeModule is accessible in JavaScript
- [ ] Authorization request shows native iOS prompt
- [ ] Notifications permission request appears
- [ ] Focus session can be started and stopped
- [ ] Notifications appear when scheduled

## Common Issues and Solutions

### Issue: "Module ScreenTimeModule does not exist"

**Solution:**
1. Ensure both `.swift` and `.m` files are added to Xcode
2. Check that files are in the correct target (should have a checkmark)
3. Clean build folder (Product → Clean Build Folder in Xcode)
4. Rebuild the app

### Issue: "Use of undeclared type 'AuthorizationCenter'"

**Solution:**
1. Verify iOS deployment target is 16.0+ for full API support
2. Check that Family Controls capability is properly added
3. Ensure you're testing on a real device, not simulator

### Issue: "FamilyControls entitlement not found"

**Solution:**
1. Verify you're signed in with an Apple Developer account in Xcode
2. Go to Signing & Capabilities → ensure Team is selected
3. Re-add the Family Controls capability
4. Clean and rebuild

### Issue: Notifications not appearing

**Solution:**
1. Check device Settings → YourApp → Notifications are enabled
2. Verify `@notifee/react-native` is properly installed
3. Check that notification permissions were granted
4. Test with a simple notification first

### Issue: "Screen Time access not authorized" even after granting

**Solution:**
1. Delete and reinstall the app
2. Go to Settings → Screen Time → App Limits → ensure your app is listed
3. Grant authorization again
4. Restart device if needed

## Testing on Real Devices

Screen Time APIs **only work on physical devices**, not simulators.

### Test Device Setup:

1. Enable Developer Mode:
   - Settings → Privacy & Security → Developer Mode → On
   - Restart device

2. Connect device to Mac

3. Select device in Xcode (top toolbar)

4. Build and run (⌘R)

### Testing Authorization:

```javascript
import { NativeModules, Alert } from 'react-native';

const testAuth = async () => {
  try {
    // Check current status
    const status = await NativeModules.ScreenTimeModule.checkAuthorizationStatus();
    console.log('Current status:', status);
    
    // Request authorization if needed
    if (!status.isAuthorized) {
      const result = await NativeModules.ScreenTimeModule.requestAuthorization();
      console.log('Authorization result:', result);
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Testing Focus Sessions:

```javascript
import FocusSessionManager from './modules/FocusSessionManager';

const testSession = async () => {
  try {
    // Initialize
    await FocusSessionManager.initialize();
    
    // Start a 5-minute test session
    const result = await FocusSessionManager.startFocusSession({
      sessionName: 'Test Session',
      durationMinutes: 5,
      usageLimit: 2,
      blockedApps: ['com.zhiliaoapp.musically'],
    });
    
    console.log('Session started:', result);
    
    // End after testing
    setTimeout(async () => {
      const endResult = await FocusSessionManager.endFocusSession();
      console.log('Session ended:', endResult);
    }, 30000); // End after 30 seconds for testing
  } catch (error) {
    console.error('Test failed:', error);
  }
};
```

## Production Considerations

### App Store Submission

1. **Privacy Policy**: Update your privacy policy to mention Screen Time data usage
2. **App Review Notes**: Explain to Apple why you need Family Controls
3. **Usage Description**: Ensure Info.plist descriptions clearly explain the feature

### Performance

1. **Battery Usage**: Screen Time monitoring is battery-efficient but inform users
2. **Background Activity**: Sessions continue even when app is backgrounded
3. **Data Storage**: Usage data is stored by iOS, not your app

### User Experience

1. **Onboarding**: Clearly explain why authorization is needed
2. **Fallback UI**: Handle denial gracefully
3. **Settings Link**: Provide easy access to iOS Settings
4. **Clear Communication**: Explain what data is monitored

## Advanced Configuration

### Custom Notification Sounds

Add custom sounds to `ios/YourApp/` and reference in notifications:

```javascript
await notifee.displayNotification({
  title: 'Focus Session',
  body: 'Time to focus!',
  ios: {
    sound: 'custom_sound.wav',
  },
});
```

### App Categories

Instead of specific apps, you can block entire categories:

```swift
// In ScreenTimeModule.swift
store.shield.applicationCategories = .specific(
  [.socialNetworking, .games, .entertainment]
)
```

### Time-based Schedules

Create recurring schedules:

```swift
let schedule = DeviceActivitySchedule(
  intervalStart: DateComponents(hour: 9, minute: 0),
  intervalEnd: DateComponents(hour: 17, minute: 0),
  repeats: true
)
```

## Support

For issues specific to:
- **React Native integration**: Check the module's GitHub issues
- **iOS Screen Time APIs**: Refer to [Apple's Documentation](https://developer.apple.com/documentation/familycontrols)
- **Notifee**: Check [Notifee Documentation](https://notifee.app/react-native/docs/overview)

## Next Steps

1. Implement the pre-built `FocusSessionScreen` component
2. Customize the UI to match your app's design
3. Add analytics to track session completion rates
4. Implement user settings for customizing blocked apps
5. Add integration with your existing study/productivity features

## Resources

- [Apple FamilyControls Documentation](https://developer.apple.com/documentation/familycontrols)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-ios)
- [Notifee Documentation](https://notifee.app)
- [WWDC 2021: Meet Screen Time API](https://developer.apple.com/videos/play/wwdc2021/10123/)
