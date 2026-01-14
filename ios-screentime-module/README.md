# iOS Screen Time Module for React Native

A complete iOS Screen Time integration for React Native that enables focus sessions and app usage monitoring.

## Features

- ✅ Request FamilyControls authorization
- ✅ Monitor app usage during focus sessions
- ✅ Block distracting apps during focus time
- ✅ Local notification scheduling
- ✅ Usage limit warnings
- ✅ Daily focus reminders
- ✅ iOS 15+ support (full features require iOS 16+)

## Installation

### 1. Install Dependencies

```bash
npm install @notifee/react-native
# or
yarn add @notifee/react-native
```

### 2. Add Files to Your iOS Project

Copy these files to your iOS project:

```
YourApp/ios/YourApp/
├── ScreenTimeModule.swift
└── ScreenTimeModule.m
```

### 3. Update Info.plist

Add the following entries to your `Info.plist`:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>We need permission to monitor screen time during focus sessions</string>

<key>NSFamilyControlsUsageDescription</key>
<string>This app uses Screen Time data to help you stay focused by monitoring app usage during focus sessions</string>
```

### 4. Add Capabilities in Xcode

1. Open your project in Xcode
2. Select your target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Family Controls"

### 5. Update Podfile

Add to your `Podfile`:

```ruby
target 'YourApp' do
  # ... existing pods
  
  pod 'notifee', :path => '../node_modules/@notifee/react-native'
end
```

Then run:

```bash
cd ios
pod install
cd ..
```

### 6. Create Bridging Header (if needed)

If you don't have a bridging header yet:

1. In Xcode, go to Build Settings
2. Search for "Swift Bridging Header"
3. Set the path to: `YourApp/YourApp-Bridging-Header.h`
4. Create the file if it doesn't exist

### 7. Copy JavaScript Files

Copy these files to your React Native project:

```
src/modules/
├── FocusSessionManager.js
└── FocusSessionScreen.jsx
```

## Usage

### Basic Setup

```javascript
import FocusSessionManager from './modules/FocusSessionManager';

// Initialize the manager
async function initializeFocusSession() {
  const result = await FocusSessionManager.initialize();
  
  if (!result.success && result.needsAuth) {
    // Request authorization
    await FocusSessionManager.requestScreenTimeAuthorization();
  }
}
```

### Start a Focus Session

```javascript
const config = {
  sessionName: 'Deep Work Session',
  durationMinutes: 60,
  usageLimit: 15, // Max minutes allowed on blocked apps
  blockedApps: [
    'com.zhiliaoapp.musically',  // TikTok
    'com.burbn.instagram',       // Instagram
    'com.twitter.twitter',       // Twitter/X
  ],
};

const result = await FocusSessionManager.startFocusSession(config);

if (result.success) {
  console.log('Session started:', result.session);
}
```

### End a Focus Session

```javascript
const result = await FocusSessionManager.endFocusSession();

if (result.success) {
  console.log('Session summary:', result.summary);
  console.log('Completion:', result.summary.completedPercentage + '%');
}
```

### Schedule Daily Reminders

```javascript
// Schedule a reminder for 9:00 AM every day
const result = await FocusSessionManager.scheduleDailyReminder(9, 0);

if (result.success) {
  console.log('Next reminder:', result.nextReminder);
}
```

### Use the Pre-built UI Component

```javascript
import FocusSessionScreen from './modules/FocusSessionScreen';

function App() {
  return <FocusSessionScreen />;
}
```

## API Reference

### FocusSessionManager

#### `initialize()`
Initialize the manager and check permissions.

**Returns:** `Promise<{ success: boolean, message?: string, needsAuth?: boolean }>`

#### `requestScreenTimeAuthorization()`
Request Screen Time authorization from the user.

**Returns:** `Promise<{ authorized: boolean }>`

#### `startFocusSession(config)`
Start a new focus session.

**Parameters:**
- `config.sessionName` (string): Name of the session
- `config.durationMinutes` (number): Session duration
- `config.usageLimit` (number): Max minutes for blocked apps
- `config.blockedApps` (string[]): Array of app bundle IDs

**Returns:** `Promise<{ success: boolean, session: Object }>`

#### `endFocusSession()`
End the current focus session.

**Returns:** `Promise<{ success: boolean, summary: Object }>`

#### `scheduleDailyReminder(hour, minute)`
Schedule a daily focus session reminder.

**Parameters:**
- `hour` (number): Hour (0-23)
- `minute` (number): Minute (0-59)

**Returns:** `Promise<{ success: boolean, nextReminder: Date }>`

#### `getCurrentSession()`
Get the current active session data.

**Returns:** `Object | null`

#### `isSessionActive()`
Check if a session is currently active.

**Returns:** `boolean`

### Native Module (ScreenTimeModule)

#### `requestAuthorization()`
Request FamilyControls authorization.

**Returns:** `Promise<{ authorized: boolean }>`

#### `checkAuthorizationStatus()`
Check current authorization status.

**Returns:** `Promise<{ status: string, isAuthorized: boolean }>`

#### `getScreenUsage(appBundleIds, startDate, endDate)`
Get screen usage data for specified apps.

**Parameters:**
- `appBundleIds` (string[]): Array of app bundle IDs
- `startDate` (number): Start timestamp in milliseconds
- `endDate` (number): End timestamp in milliseconds

**Returns:** `Promise<{ apps: Array, totalTime: number }>`

#### `blockApps(appBundleIds)`
Block specified apps.

**Parameters:**
- `appBundleIds` (string[]): Array of app bundle IDs to block

**Returns:** `Promise<{ blocked: boolean, count: number }>`

#### `unblockApps()`
Remove all app blocks.

**Returns:** `Promise<{ blocked: false }>`

#### `startMonitoring(appBundleIds, thresholdMinutes)`
Start monitoring app usage.

**Parameters:**
- `appBundleIds` (string[]): Apps to monitor
- `thresholdMinutes` (number): Usage threshold

**Returns:** `Promise<{ monitoring: boolean }>`

#### `stopMonitoring()`
Stop monitoring app usage.

**Returns:** `Promise<{ monitoring: false }>`

## Common App Bundle IDs

Here are some common social media app bundle IDs:

```javascript
const COMMON_BUNDLE_IDS = {
  tiktok: 'com.zhiliaoapp.musically',
  instagram: 'com.burbn.instagram',
  twitter: 'com.twitter.twitter',
  facebook: 'com.facebook.Facebook',
  snapchat: 'com.toyopagroup.picaboo',
  reddit: 'com.reddit.Reddit',
  youtube: 'com.google.ios.youtube',
  whatsapp: 'net.whatsapp.WhatsApp',
  telegram: 'ph.telegra.Telegraph',
};
```

## Important Notes

### iOS 16+ Requirement

Full Screen Time API functionality requires iOS 16 or later. The module includes:
- Authorization check for iOS 15 compatibility
- Graceful degradation for older versions
- Feature detection with `ScreenTimeModule.isAvailable`

### DeviceActivityReport Extension

For accurate usage data, you need to implement a DeviceActivityReport extension:

1. In Xcode: File → New → Target → Device Activity Report Extension
2. Implement the report view in the extension
3. The extension runs in a separate process and provides usage statistics

The current implementation includes a basic structure but returns mock data. See Apple's documentation for implementing the full DeviceActivityReport.

### Privacy Considerations

- Screen Time data is highly sensitive
- Users must explicitly grant authorization
- Data cannot be exported or shared
- Only works in release builds signed with your App Store team

### Testing

Screen Time features can only be tested:
- On real devices (not simulator)
- With a provisioning profile that includes Family Controls capability
- In builds signed with your App Store team ID

## Troubleshooting

### "Screen Time API requires iOS 16+"

The full API requires iOS 16+. Consider:
- Showing alternative features for iOS 15 users
- Using the module's `isAvailable` constant to check support

### "Screen Time access not authorized"

The user hasn't granted permission. Call:
```javascript
await FocusSessionManager.requestScreenTimeAuthorization();
```

### App blocking not working

1. Verify FamilyControls capability is added in Xcode
2. Check authorization status
3. Ensure app is signed with correct team ID
4. Test on a real device (not simulator)

### Notifications not appearing

1. Check notification permissions:
```javascript
await FocusSessionManager.requestNotificationPermissions();
```

2. Verify Info.plist has notification usage description
3. Check device notification settings

## Example Integration

See `FocusSessionScreen.jsx` for a complete example with:
- Authorization flow
- Session management UI
- Usage warnings
- Settings integration

## License

MIT

## Credits

Built for React Native apps targeting iOS 15+.
Uses Apple's FamilyControls, DeviceActivity, and ManagedSettings frameworks.
