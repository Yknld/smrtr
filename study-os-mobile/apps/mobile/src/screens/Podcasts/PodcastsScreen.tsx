import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../ui/tokens';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useNavigation } from '@react-navigation/native';
import { CourseWithPodcasts, fetchCoursesWithPodcasts } from '../../data/podcasts.repository';

export const PodcastsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [courses, setCourses] = useState<CourseWithPodcasts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const data = await fetchCoursesWithPodcasts();
      setCourses(data);
    } catch (error: any) {
      console.error('Failed to load courses with podcasts:', error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleCoursePress = (course: CourseWithPodcasts) => {
    navigation.navigate('Podcasts', {
      screen: 'CoursePodcasts',
      params: {
        courseId: course.id,
        courseTitle: course.title,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Podcasts</Text>
        </View>
        
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : courses.length === 0 ? (
          <EmptyState
            title="No podcasts yet"
            subtitle="Generate podcasts from your lessons to listen on the go"
          />
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => handleCoursePress(course)}
                activeOpacity={0.7}
              >
                <View style={[styles.courseIndicator, { backgroundColor: course.color || colors.primary }]} />
                
                <View style={styles.courseContent}>
                  <View style={styles.courseHeader}>
                    <Text style={styles.courseTitle} numberOfLines={1}>
                      {course.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </View>
                  
                  <View style={styles.courseMeta}>
                    <Ionicons name="headset-outline" size={16} color={colors.textTertiary} />
                    <Text style={styles.courseMetaText}>
                      {course.podcastCount} {course.podcastCount === 1 ? 'podcast' : 'podcasts'}
                    </Text>
                    <Text style={styles.courseMetaText}>•</Text>
                    <Text style={styles.courseMetaText}>
                      {formatDate(course.lastPodcastAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  courseCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  courseIndicator: {
    width: 4,
  },
  courseContent: {
    flex: 1,
    padding: spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  courseTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  courseMetaText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
});
