import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, shadows } from '../../ui/tokens';

interface ScheduleBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (schedule: {
    title: string;
    days: number[];
    time: Date;
    duration: number;
    reminder: number;
  }) => void;
  defaultTitle?: string;
  loading?: boolean;
}

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
];

const REMINDERS = [
  { label: '5 min before', value: 5 },
  { label: '10 min before', value: 10 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
];

const DAYS = [
  { short: 'Su', label: 'Sunday', value: 0 },
  { short: 'M', label: 'Monday', value: 1 },
  { short: 'T', label: 'Tuesday', value: 2 },
  { short: 'W', label: 'Wednesday', value: 3 },
  { short: 'Th', label: 'Thursday', value: 4 },
  { short: 'F', label: 'Friday', value: 5 },
  { short: 'Sa', label: 'Saturday', value: 6 },
];

export const ScheduleBottomSheet: React.FC<ScheduleBottomSheetProps> = ({
  visible,
  onClose,
  onSave,
  defaultTitle = '',
  loading = false,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(45);
  const [reminder, setReminder] = useState(10);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setTitle(defaultTitle);
      setSelectedDays([]);
      const now = new Date();
      now.setHours(19, 0, 0, 0); // Default to 7 PM
      setTime(now);
      setDuration(45);
      setReminder(10);
    }
  }, [visible, defaultTitle]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    onSave({
      title: title.trim(),
      days: selectedDays,
      time,
      duration,
      reminder,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTime(selectedDate);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Handle */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Schedule Study Time</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
              >
                {/* Title Input */}
                <View style={styles.section}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Morning Study"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                  />
                </View>

                {/* Day Selector */}
                <View style={styles.section}>
                  <Text style={styles.label}>Days</Text>
                  <View style={styles.dayGrid}>
                    {DAYS.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayButton,
                          selectedDays.includes(day.value) && styles.dayButtonActive,
                        ]}
                        onPress={() => toggleDay(day.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayButtonText,
                            selectedDays.includes(day.value) && styles.dayButtonTextActive,
                          ]}
                        >
                          {day.short}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Time Picker */}
                <View style={styles.section}>
                  <Text style={styles.label}>Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.timeButtonText}>{formatTime(time)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {showTimePicker && (
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                  />
                )}

                {/* Duration Selector */}
                <View style={styles.section}>
                  <Text style={styles.label}>Duration</Text>
                  <View style={styles.optionGrid}>
                    {DURATIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.optionButton,
                          duration === opt.value && styles.optionButtonActive,
                        ]}
                        onPress={() => setDuration(opt.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            duration === opt.value && styles.optionButtonTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Reminder Selector */}
                <View style={styles.section}>
                  <Text style={styles.label}>Reminder</Text>
                  <View style={styles.optionGrid}>
                    {REMINDERS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.optionButton,
                          reminder === opt.value && styles.optionButtonActive,
                        ]}
                        onPress={() => setReminder(opt.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            reminder === opt.value && styles.optionButtonTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Save Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Creating...' : 'Create Schedule'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
    maxHeight: '90%',
    ...shadows.elevated,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderDark,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dayGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: colors.textOnPrimary,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  optionButtonTextActive: {
    color: colors.textOnPrimary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
    letterSpacing: -0.2,
  },
});
