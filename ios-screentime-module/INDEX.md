# iOS Screen Time Module - File Index

## 📦 Package Contents

This directory contains a complete iOS Screen Time integration for React Native. Below is a guide to all files and their purposes.

---

## 🔧 Core Implementation Files

### 1. `ScreenTimeModule.swift`
**Type:** Native iOS (Swift)  
**Size:** ~500 lines  
**Purpose:** Main native implementation using Apple's FamilyControls, DeviceActivity, and ManagedSettings APIs

**What it does:**
- Requests and checks Screen Time authorization
- Monitors app usage with DeviceActivity
- Blocks/unblocks apps using ManagedSettings
- Bridges Swift code to React Native

**Add to:** Your iOS project in Xcode (copy to `ios/YourApp/` folder)

---

### 2. `ScreenTimeModule.m`
**Type:** Objective-C Bridge  
**Size:** ~30 lines  
**Purpose:** Exposes Swift methods to React Native bridge

**What it does:**
- Uses `RCT_EXTERN_MODULE` to register the module
- Exports all Swift methods to JavaScript
- Handles promise-based async communication

**Add to:** Your iOS project in Xcode (same location as .swift file)

---

### 3. `FocusSessionManager.js`
**Type:** JavaScript Manager  
**Size:** ~400 lines  
**Purpose:** High-level abstraction over the native module

**What it does:**
- Manages focus session lifecycle
- Handles notification scheduling
- Monitors usage during sessions
- Provides simple async/await API
- Manages session state

**Add to:** Your React Native project (e.g., `src/modules/FocusSessionManager.js`)

**Example usage:**
```javascript
import FocusSessionManager from './modules/FocusSessionManager';

await FocusSessionManager.startFocusSession({
  sessionName: 'Study Time',
  durationMinutes: 60,
  usageLimit: 15,
  blockedApps: ['com.zhiliaoapp.musically'],
});
```

---

## 🎨 UI Components

### 4. `FocusSessionScreen.jsx`
**Type:** React Native Component  
**Size:** ~300 lines  
**Purpose:** Complete, production-ready focus session interface

**Features:**
- Authorization request flow
- Session start/stop controls
- Live countdown timer
- Session statistics display
- Settings integration
- Error handling

**Add to:** Your screens folder (e.g., `src/screens/FocusSessionScreen.jsx`)

**Usage:**
```javascript
import FocusSessionScreen from './screens/FocusSessionScreen';

// Add to your navigation
<Stack.Screen name="FocusSession" component={FocusSessionScreen} />
```

---

### 5. `ExampleUsage.jsx`
**Type:** Code Examples  
**Size:** ~400 lines  
**Purpose:** 6 complete example implementations

**Contains:**
1. SimpleFocusButton - Minimal implementation
2. AuthorizationFlow - Permission handling
3. CustomSessionConfig - User customization
4. SessionTimer - Live countdown
5. AdvancedNativeUsage - Direct native access
6. ScheduledSessions - Scheduled reminders

**Use for:** Reference when building your own UI

---

## 📚 Documentation

### 6. `README.md`
**Type:** Main Documentation  
**Size:** ~600 lines  
**Purpose:** Comprehensive guide to the module

**Sections:**
- Features overview
- Installation steps
- Usage examples
- Complete API reference
- Common app bundle IDs
- Troubleshooting guide
- Important notes

**Read this:** When starting integration

---

### 7. `SETUP_GUIDE.md`
**Type:** Integration Guide  
**Size:** ~500 lines  
**Purpose:** Step-by-step integration walkthrough

**Sections:**
- Prerequisites
- 11-step setup process
- Xcode configuration
- Info.plist setup
- Testing procedures
- Common issues and solutions
- Production considerations

**Read this:** During integration

---

### 8. `QUICK_REFERENCE.md`
**Type:** Quick Reference  
**Size:** ~300 lines  
**Purpose:** Fast lookup for common tasks

**Sections:**
- TL;DR integration
- Common app bundle IDs
- API cheat sheet
- Minimal examples
- Debug commands
- Configuration presets

**Read this:** When you need quick answers

---

### 9. `IMPLEMENTATION_SUMMARY.md`
**Type:** Technical Overview  
**Size:** ~700 lines  
**Purpose:** Complete technical specification

**Sections:**
- Architecture overview
- Feature list
- Technical specifications
- File structure
- Testing strategy
- Performance notes
- Future enhancements

**Read this:** To understand the complete system

---

## ⚙️ Configuration Files

### 10. `package.json`
**Type:** NPM Package Configuration  
**Purpose:** Package metadata and dependencies

**Dependencies:**
- `@notifee/react-native`: ^7.8.0

**Peer dependencies:**
- React: >=17.0.0
- React Native: >=0.64.0

---

### 11. `Info.plist.example`
**Type:** iOS Configuration Template  
**Size:** ~150 lines  
**Purpose:** Example Info.plist configuration

**Contains:**
- Required permission descriptions
- Family Controls usage description
- Notification configuration
- Optional features
- Best practices comments

**Use for:** Reference when updating your Info.plist

---

### 12. `INDEX.md`
**Type:** This File  
**Purpose:** Directory overview and file guide

---

## 🚀 Quick Start

### Absolute Minimum to Get Started

**3 files required:**
1. `ScreenTimeModule.swift` → Add to Xcode
2. `ScreenTimeModule.m` → Add to Xcode
3. `FocusSessionManager.js` → Add to React Native project

**Configuration:**
- Add Family Controls capability in Xcode
- Update Info.plist with usage description
- Install `@notifee/react-native`

**Code:**
```javascript
import FocusSessionManager from './FocusSessionManager';

await FocusSessionManager.initialize();
await FocusSessionManager.startFocusSession({
  sessionName: 'Focus',
  durationMinutes: 25,
  usageLimit: 5,
  blockedApps: ['com.zhiliaoapp.musically'],
});
```

---

## 📖 Recommended Reading Order

### For First-Time Integration:
1. **README.md** - Understand what the module does
2. **SETUP_GUIDE.md** - Follow step-by-step integration
3. **QUICK_REFERENCE.md** - Bookmark for later
4. **ExampleUsage.jsx** - See code examples

### For Development:
1. **QUICK_REFERENCE.md** - Quick API lookup
2. **ExampleUsage.jsx** - Copy-paste examples
3. **FocusSessionScreen.jsx** - Reference UI implementation

### For Understanding Architecture:
1. **IMPLEMENTATION_SUMMARY.md** - Complete technical overview
2. **ScreenTimeModule.swift** - Native implementation
3. **FocusSessionManager.js** - JavaScript abstraction

---

## 🗂 File Organization in Your Project

### Recommended Structure:

```
YourReactNativeApp/
├── ios/
│   └── YourApp/
│       ├── ScreenTimeModule.swift      ← Add this
│       ├── ScreenTimeModule.m          ← Add this
│       └── Info.plist                  ← Update this
│
├── src/
│   ├── modules/
│   │   └── FocusSessionManager.js      ← Add this
│   │
│   └── screens/
│       └── FocusSessionScreen.jsx      ← Add this (optional)
│
├── docs/
│   └── screen-time/                    ← Optional: keep docs here
│       ├── README.md
│       ├── SETUP_GUIDE.md
│       └── QUICK_REFERENCE.md
│
└── package.json                        ← Update dependencies
```

---

## 📊 File Statistics

| File | Type | Lines | Essential |
|------|------|-------|-----------|
| ScreenTimeModule.swift | Swift | ~500 | ✅ Yes |
| ScreenTimeModule.m | ObjC | ~30 | ✅ Yes |
| FocusSessionManager.js | JS | ~400 | ✅ Yes |
| FocusSessionScreen.jsx | JSX | ~300 | ⭐ Optional |
| ExampleUsage.jsx | JSX | ~400 | 📖 Reference |
| README.md | Docs | ~600 | 📖 Reference |
| SETUP_GUIDE.md | Docs | ~500 | 📖 Reference |
| QUICK_REFERENCE.md | Docs | ~300 | 📖 Reference |
| IMPLEMENTATION_SUMMARY.md | Docs | ~700 | 📖 Reference |
| Info.plist.example | Config | ~150 | 📖 Reference |
| package.json | Config | ~20 | ℹ️ Info |
| INDEX.md | Docs | ~200 | ℹ️ Info |

**Total:** 12 files, ~4,100 lines

**Essential files:** 3  
**Optional but useful:** 2  
**Documentation:** 7

---

## 🔍 What Each File Type Does

### Swift Files (.swift)
- Native iOS code
- Uses Apple's FamilyControls APIs
- Runs in main iOS process
- Full access to device features

### Objective-C Files (.m)
- Bridge between Swift and React Native
- Exports methods to JavaScript
- Handles type conversions

### JavaScript Files (.js)
- React Native business logic
- Manages state and flow
- Calls native modules
- Pure JavaScript (no JSX)

### React Components (.jsx)
- UI components
- User interface logic
- Uses React hooks
- Includes styling

### Markdown Files (.md)
- Documentation
- Setup guides
- API references
- Examples

### Config Files (.json, .plist)
- Package metadata
- iOS permissions
- Dependencies
- Build settings

---

## 💡 How to Use This Package

### Option 1: Use Everything
Copy all files, follow SETUP_GUIDE.md, use FocusSessionScreen.jsx as-is

### Option 2: Use Core + Custom UI
Copy native files + FocusSessionManager.js, build your own UI using ExampleUsage.jsx as reference

### Option 3: Direct Native Access
Copy native files only, call ScreenTimeModule directly from your code

---

## 🎯 Next Steps

1. **Read** README.md to understand capabilities
2. **Follow** SETUP_GUIDE.md to integrate
3. **Reference** QUICK_REFERENCE.md during development
4. **Copy** examples from ExampleUsage.jsx
5. **Customize** FocusSessionScreen.jsx to match your design

---

## 📞 Need Help?

- Check **QUICK_REFERENCE.md** for common tasks
- See **SETUP_GUIDE.md** troubleshooting section
- Review **ExampleUsage.jsx** for working examples
- Read **IMPLEMENTATION_SUMMARY.md** for architecture details

---

## ✅ Integration Checklist

- [ ] Read README.md
- [ ] Install @notifee/react-native
- [ ] Add .swift and .m files to Xcode
- [ ] Add Family Controls capability
- [ ] Update Info.plist
- [ ] Copy FocusSessionManager.js to project
- [ ] Run pod install
- [ ] Test on real device
- [ ] Request authorization
- [ ] Start test session
- [ ] Verify notifications work

---

**Total Package Weight:** ~50 KB  
**Integration Time:** 30-45 minutes  
**Maintenance:** Low (uses stable iOS APIs)  
**Dependencies:** 1 (notifee)  
**iOS Version:** 15.0+ (16.0+ recommended)

---

**Package Status:** ✅ Complete and production-ready

**Last Updated:** January 2026
