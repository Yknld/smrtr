# Settings & Analytics Screens

Complete implementation of settings navigation and analytics features for Study OS mobile app.

## Created Screens

### Main Settings Screen (`SettingsScreen.tsx`)
- Profile section with user avatar and email
- Analytics card for quick access to study insights
- Account section: Profile, Notifications
- Study section: Study Preferences, Language
- About section: Help & Support, Privacy Policy, Terms of Service
- Sign out functionality

### Profile Screen (`ProfileScreen.tsx`)
- View and edit user profile information
- Name and bio editing
- Email display (read-only)
- Avatar with user initial
- Save functionality with Supabase integration

### Notifications Screen (`NotificationsScreen.tsx`)
- Push notification settings with toggle switches
- Email notification preferences
- Granular control over:
  - Study reminders
  - Lesson updates
  - Podcast releases
  - Weekly digest
  - Product updates

### Study Preferences Screen (`StudyPreferencesScreen.tsx`)
- Auto-generation settings:
  - Auto-generate notes
  - Auto-generate flashcards
  - Auto-play podcasts
- Daily study goals with time selection
- Default playback speed settings (0.75x - 2.0x)

### Language Screen (`LanguageScreen.tsx`)
- Language selection interface
- 12 supported languages with native names
- Visual selection with checkmark indicator

### Help & Support Screen (`HelpSupportScreen.tsx`)
- FAQ link
- Documentation access
- Email support contact
- App version and build information

### Privacy Policy Screen (`PrivacyPolicyScreen.tsx`)
- Complete privacy policy text
- Information collection details
- Data usage explanation
- User rights information
- Contact information

### Terms of Service Screen (`TermsOfServiceScreen.tsx`)
- Complete terms of service text
- Usage guidelines
- User content rights
- Intellectual property information
- Liability and termination clauses

### Analytics Screen (`AnalyticsScreen.tsx`)
- **Period selector**: Week, Month, All time
- **Main stats cards**:
  - Total study time (formatted as hours/minutes)
  - Current streak (days)
- **Weekly activity chart**: Bar chart showing daily study minutes
- **Progress metrics**:
  - Lessons completed
  - Active courses
  - Notes created
  - Flashcards completed
  - Quizzes completed
  - Podcasts listened
- **Achievements**:
  - Longest streak tracking
- **Data integration**: Real-time data from Supabase

## Navigation Structure

```
Settings Tab
├── SettingsMain (main settings screen)
├── Profile
├── Notifications
├── StudyPreferences
├── Language
├── HelpSupport
├── PrivacyPolicy
├── TermsOfService
└── Analytics
```

## Design Principles

All screens follow the established design system:
- Muted gray color palette
- Flat surfaces (no heavy shadows)
- Consistent spacing and typography
- Clean, minimal UI without marketing copy
- Subtle borders and elevated surfaces

## Key Features

1. **Stack Navigation**: Full navigation stack for settings with back button support
2. **Type Safety**: Complete TypeScript types in `navigation.ts`
3. **Supabase Integration**: Real data loading from database
4. **Responsive Design**: Adapts to different screen sizes
5. **Accessibility**: Uses Ionicons for clear visual communication
6. **State Management**: Local state with React hooks
7. **Form Handling**: Edit/save flows with validation

## Technical Details

### Dependencies Used
- `@react-navigation/native-stack` for navigation
- `@expo/vector-icons` (Ionicons) for icons
- React Native components: ScrollView, TouchableOpacity, Switch, TextInput
- Supabase client for data operations

### Data Sources
- User profile: `supabase.auth.getUser()`
- Courses: `courses` table
- Lessons: `lessons` table
- Notes: `notes_v2` table

### Mock Data
Some analytics metrics use mock data for demonstration:
- Study time tracking
- Streak calculations
- Flashcard/quiz completion counts

These can be replaced with real tracking data from a usage analytics table.

## Future Enhancements

- Add photo upload for profile avatar
- Implement actual language switching
- Add more analytics visualizations
- Track real study time with background timers
- Add achievements/badges system
- Implement notification scheduling
- Add data export functionality
