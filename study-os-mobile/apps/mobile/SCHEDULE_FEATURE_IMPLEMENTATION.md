# Study Schedule Feature Implementation

## Overview

Complete implementation of the study schedule feature that allows users to create recurring study schedules for their lessons and courses.

## ✅ What Was Built

### 1. Backend API Integration
**File:** `src/data/schedule.repository.ts`

- `upsertStudyPlan()` - Create or update study plans with recurrence rules
- `fetchStudyPlans()` - Get all user's study plans
- `fetchStudyPlanWithRules()` - Get a specific plan with its rules
- `deleteStudyPlan()` - Delete a schedule
- `toggleStudyPlan()` - Enable/disable a schedule
- `buildRRule()` - Helper to create RRULE strings from day selections
- `parseRRule()` - Helper to parse RRULE strings

**Backend Endpoint Used:**
```
POST /functions/v1/study_plan_upsert
```

### 2. Schedule Creation UI
**File:** `src/components/ScheduleBottomSheet/ScheduleBottomSheet.tsx`

A beautiful bottom sheet modal with:
- **Title input** - Pre-filled with lesson/course name
- **Day selector** - Visual buttons for each day (Su, M, T, W, Th, F, Sa)
- **Time picker** - Native iOS/Android time picker
- **Duration selector** - 30 min, 45 min, 1 hour, 1.5 hours, 2 hours
- **Reminder selector** - 5, 10, 15, 30 minutes before

### 3. Lesson Hub Integration
**File:** `src/screens/LessonHub/LessonHubScreen.tsx`

- Calendar icon in top right now opens schedule sheet
- Pre-fills title with "Study [Lesson Name]"
- Automatically links schedule to the lesson's course
- Shows success message after creation

### 4. All Schedules Screen
**File:** `src/screens/AllSchedules/AllSchedulesScreen.tsx`

Master view of all study schedules:
- Lists all user's schedules
- Shows course badge for course-linked schedules
- Toggle to enable/disable schedules
- Delete schedules with confirmation
- Pull-to-refresh support
- Empty state for new users

### 5. Navigation Setup
**Files:** 
- `src/navigation/AppNavigator.tsx`
- `src/types/navigation.ts`

Added `AllSchedules` screen to HomeStack navigator.

## Database Schema

The backend uses 4 tables (already migrated):

### `study_plans`
- `id` - UUID
- `user_id` - UUID (references auth.users)
- `course_id` - UUID (optional, references courses)
- `title` - Text
- `timezone` - Text (IANA timezone)
- `is_enabled` - Boolean
- `created_at` - Timestamp

### `study_plan_rules`
- `id` - UUID
- `user_id` - UUID
- `study_plan_id` - UUID (references study_plans)
- `rrule` - Text (iCalendar RRULE format)
- `start_time_local` - Time
- `duration_min` - Integer (5-600)
- `remind_before_min` - Integer (0-120)
- `created_at` - Timestamp

### `device_push_tokens`
For push notifications (future feature)

### `scheduled_notifications`
Notification queue (future feature)

## RRULE Format

Schedules use the iCalendar RRULE standard:

**Examples:**
- Daily: `FREQ=DAILY`
- Monday/Wednesday/Friday: `FREQ=WEEKLY;BYDAY=MO,WE,FR`
- Weekends: `FREQ=WEEKLY;BYDAY=SA,SU`
- Weekdays: `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`

## User Flow

1. **From Lesson Screen:**
   - User taps calendar icon (top right)
   - Schedule sheet opens with title pre-filled
   - User selects days, time, duration, reminder
   - Taps "Create Schedule"
   - Success message shown

2. **View All Schedules:**
   - Navigate to AllSchedules screen
   - See all active and paused schedules
   - Toggle schedules on/off
   - Delete schedules

3. **Future: Notifications**
   - Backend will generate `scheduled_notifications` based on rules
   - Push notifications sent at scheduled times
   - Users receive reminders before study sessions

## Installation

The feature requires the `@react-native-community/datetimepicker` package:

```bash
cd study-os-mobile/apps/mobile
npm install @react-native-community/datetimepicker@7.6.1
```

Or if using the root:
```bash
cd study-os-mobile
npm install
```

## Testing Checklist

### ✅ Manual Testing Steps

1. **Create Schedule:**
   - [ ] Open any lesson from LessonHub
   - [ ] Tap calendar icon (top right)
   - [ ] Verify title is pre-filled
   - [ ] Select multiple days
   - [ ] Change time (should show native picker)
   - [ ] Select duration and reminder
   - [ ] Tap "Create Schedule"
   - [ ] Verify success message

2. **View Schedules:**
   - [ ] Navigate to AllSchedules screen
   - [ ] Verify schedule appears in list
   - [ ] Check course badge shows if linked to course

3. **Toggle Schedule:**
   - [ ] Tap checkmark icon to disable
   - [ ] Verify "Paused" badge appears
   - [ ] Tap again to re-enable

4. **Delete Schedule:**
   - [ ] Tap trash icon
   - [ ] Verify confirmation alert
   - [ ] Confirm deletion
   - [ ] Verify schedule removed from list

5. **Edge Cases:**
   - [ ] Try creating schedule without selecting days (should show error)
   - [ ] Try creating schedule with empty title (should show error)
   - [ ] Create schedule from general lesson (no course)
   - [ ] Pull to refresh on AllSchedules screen

## Future Enhancements

### Phase 2: Notifications
- Implement push notification registration
- Generate scheduled notifications based on rules
- Send reminders at specified times
- Handle notification actions (start study, snooze)

### Phase 3: Calendar View
- Add calendar visualization
- Show upcoming sessions
- Quick reschedule/skip options
- Track completion stats

### Phase 4: Smart Scheduling
- AI-suggested study times based on user patterns
- Adaptive scheduling based on progress
- Conflict detection with other schedules
- Integration with device calendar

## Technical Notes

### Timezone Handling
- Schedules store local time + timezone
- Backend converts to UTC for notifications
- Handles DST automatically
- Uses device timezone by default

### Data Flow
```
User Input → ScheduleBottomSheet
  ↓
  buildRRule(days) → "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  ↓
  upsertStudyPlan() → POST /study_plan_upsert
  ↓
  Backend validates + saves to Supabase
  ↓
  Success → Close sheet + Show message
```

### Performance
- Schedules loaded on screen mount
- Pull-to-refresh for manual updates
- Optimistic UI updates for toggle/delete
- Minimal re-renders with proper state management

## Files Created/Modified

### Created:
- `src/data/schedule.repository.ts` (220 lines)
- `src/components/ScheduleBottomSheet/ScheduleBottomSheet.tsx` (470 lines)
- `src/screens/AllSchedules/AllSchedulesScreen.tsx` (320 lines)
- `SCHEDULE_FEATURE_IMPLEMENTATION.md` (this file)

### Modified:
- `src/screens/LessonHub/LessonHubScreen.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/types/navigation.ts`
- `package.json`

**Total:** ~1,000 lines of new code

## Design Compliance

✅ **Follows project design rules:**
- No centered hero empty states
- No large primary buttons (used regular sized)
- No emojis or illustrations
- No full-width CTAs
- No saturated accent colors
- No shadows > 4dp
- No gradients
- No marketing copy

✅ **Uses design tokens:**
- `colors.*` for all colors
- `spacing.*` for all spacing
- `borderRadius.*` for all border radii
- `shadows.*` for elevation

## Summary

The schedule feature is **complete and ready for testing**. Users can now:
1. Create recurring study schedules from any lesson
2. View and manage all their schedules in one place
3. Enable/disable schedules without deleting them
4. Link schedules to specific courses

The foundation is in place for push notifications and calendar integration in future phases.
