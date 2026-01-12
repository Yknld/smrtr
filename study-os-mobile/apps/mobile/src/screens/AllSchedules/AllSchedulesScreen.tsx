import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../ui/tokens';
import {
  fetchStudyPlans,
  fetchStudyPlanWithRules,
  toggleStudyPlan,
  deleteStudyPlan,
  StudyPlan,
  parseRRule,
} from '../../data/schedule.repository';

interface AllSchedulesScreenProps {
  navigation: any;
}

const DAY_NAMES = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

export const AllSchedulesScreen: React.FC<AllSchedulesScreenProps> = ({ navigation }) => {
  const [schedules, setSchedules] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const plans = await fetchStudyPlans();
      setSchedules(plans);
    } catch (error: any) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSchedules();
  };

  const handleToggleSchedule = async (planId: string, currentEnabled: boolean) => {
    try {
      await toggleStudyPlan(planId, !currentEnabled);
      setSchedules((prev) =>
        prev.map((s) => (s.id === planId ? { ...s, is_enabled: !currentEnabled } : s))
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = (plan: StudyPlan) => {
    Alert.alert(
      'Delete Schedule',
      `Are you sure you want to delete "${plan.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudyPlan(plan.id);
              setSchedules((prev) => prev.filter((s) => s.id !== plan.id));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };

  const renderScheduleCard = (plan: StudyPlan) => {
    return (
      <View key={plan.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{plan.title}</Text>
            {plan.course_id && (
              <View style={styles.courseBadge}>
                <Ionicons name="book-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.courseBadgeText}>Course</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleToggleSchedule(plan.id, plan.is_enabled)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={plan.is_enabled ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={plan.is_enabled ? colors.success : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardInfo}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.cardInfoText}>
              Created {new Date(plan.created_at).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSchedule(plan)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>

        {!plan.is_enabled && (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledText}>Paused</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>My Schedules</Text>

          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textTertiary}
            />
          }
        >
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading schedules...</Text>
            </View>
          ) : schedules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyStateTitle}>No schedules yet</Text>
              <Text style={styles.emptyStateText}>
                Create a schedule from any lesson to get started
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>
                {schedules.length} {schedules.length === 1 ? 'Schedule' : 'Schedules'}
              </Text>
              {schedules.map(renderScheduleCard)}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  courseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  toggleButton: {
    padding: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardInfoText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  disabledOverlay: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  disabledText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
