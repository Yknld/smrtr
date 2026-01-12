import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { colors, spacing, typography } from '../../ui/tokens';

interface AnalyticsScreenProps {
  navigation: any;
}

interface StudyStats {
  totalStudyTime: number;
  lessonsCompleted: number;
  coursesActive: number;
  currentStreak: number;
  longestStreak: number;
  notesCreated: number;
  flashcardsCompleted: number;
  quizzesCompleted: number;
  podcastsListened: number;
  weeklyActivity: number[];
}

const { width } = Dimensions.get('window');

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StudyStats>({
    totalStudyTime: 0,
    lessonsCompleted: 0,
    coursesActive: 0,
    currentStreak: 0,
    longestStreak: 0,
    notesCreated: 0,
    flashcardsCompleted: 0,
    quizzesCompleted: 0,
    podcastsListened: 0,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get courses count
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user.id);

      // Get lessons count
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('course_id', courses?.map(c => c.id) || []);

      // Get notes count
      const { data: notes } = await supabase
        .from('notes_v2')
        .select('id')
        .in('lesson_id', lessons?.map(l => l.id) || []);

      // Mock weekly activity data (in a real app, this would come from a usage tracking table)
      const weeklyActivity = [12, 25, 18, 30, 22, 35, 28];

      setStats({
        totalStudyTime: 1247, // minutes - mock data
        lessonsCompleted: lessons?.length || 0,
        coursesActive: courses?.length || 0,
        currentStreak: 5, // days - mock data
        longestStreak: 12, // days - mock data
        notesCreated: notes?.length || 0,
        flashcardsCompleted: 124, // mock data
        quizzesCompleted: 8, // mock data
        podcastsListened: 15, // mock data
        weeklyActivity,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderActivityBar = (value: number, index: number) => {
    const maxValue = Math.max(...stats.weeklyActivity);
    const height = maxValue > 0 ? (value / maxValue) * 60 : 0;
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
      <View key={index} style={styles.activityBarContainer}>
        <View style={styles.activityBar}>
          <View style={[styles.activityBarFill, { height: height || 4 }]} />
        </View>
        <Text style={styles.activityLabel}>{days[index]}</Text>
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
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Analytics</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {(['week', 'month', 'all'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Main Stats */}
          <View style={styles.mainStatsGrid}>
            <View style={styles.mainStatCard}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <Text style={styles.mainStatValue}>{formatTime(stats.totalStudyTime)}</Text>
              <Text style={styles.mainStatLabel}>Study Time</Text>
            </View>

            <View style={styles.mainStatCard}>
              <Ionicons name="flame-outline" size={24} color={colors.warning} />
              <Text style={styles.mainStatValue}>{stats.currentStreak}</Text>
              <Text style={styles.mainStatLabel}>Day Streak</Text>
            </View>
          </View>

          {/* Weekly Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Activity</Text>
            <View style={styles.activityChart}>
              {stats.weeklyActivity.map((value, index) => renderActivityBar(value, index))}
            </View>
            <Text style={styles.activityHint}>Minutes studied per day</Text>
          </View>

          {/* Detailed Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress</Text>
            
            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="book-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.statLabel}>Lessons Completed</Text>
              <Text style={styles.statValue}>{stats.lessonsCompleted}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="library-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.statLabel}>Active Courses</Text>
              <Text style={styles.statValue}>{stats.coursesActive}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.statLabel}>Notes Created</Text>
              <Text style={styles.statValue}>{stats.notesCreated}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="albums-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.statLabel}>Flashcards Completed</Text>
              <Text style={styles.statValue}>{stats.flashcardsCompleted}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.statLabel}>Quizzes Completed</Text>
              <Text style={styles.statValue}>{stats.quizzesCompleted}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="headset-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.statLabel}>Podcasts Listened</Text>
              <Text style={styles.statValue}>{stats.podcastsListened}</Text>
            </View>
          </View>

          {/* Achievements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            
            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Ionicons name="trophy-outline" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statLabel}>Longest Streak</Text>
              <Text style={styles.statValue}>{stats.longestStreak} days</Text>
            </View>
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0,
  },
  periodButtonTextActive: {
    color: colors.primary,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  mainStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    letterSpacing: 0,
  },
  mainStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  activityChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  activityBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  activityBar: {
    width: 24,
    height: 60,
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  activityBarFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  activityLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0,
  },
  activityHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statIcon: {
    width: 32,
    marginRight: spacing.sm,
  },
  statLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0,
  },
});
