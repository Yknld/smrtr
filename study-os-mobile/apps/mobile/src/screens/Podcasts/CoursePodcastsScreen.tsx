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
import { LessonPodcast, fetchCoursePodcasts } from '../../data/podcasts.repository';

interface CoursePodcastsScreenProps {
  route: {
    params: {
      courseId: string;
      courseTitle: string;
    };
  };
  navigation: any;
}

export const CoursePodcastsScreen: React.FC<CoursePodcastsScreenProps> = ({ route, navigation }) => {
  const { courseId, courseTitle } = route.params;
  const [podcasts, setPodcasts] = useState<LessonPodcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPodcasts = useCallback(async () => {
    try {
      const data = await fetchCoursePodcasts(courseId);
      setPodcasts(data);
    } catch (error: any) {
      console.error('Failed to load course podcasts:', error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPodcasts();
  };

  const formatDuration = (durationMs?: number): string => {
    if (!durationMs) return '--:--';
    const totalSeconds = Math.floor(durationMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const handlePodcastPress = (podcast: LessonPodcast) => {
    navigation.navigate('PodcastPlayer', {
      lessonId: podcast.lessonId,
      lessonTitle: podcast.lessonTitle,
      podcastUrl: podcast.storageUrl,
      podcastAvailable: true,
    });
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {courseTitle}
          </Text>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : podcasts.length === 0 ? (
          <EmptyState
            title="No podcasts yet"
            subtitle="Generate podcasts from lessons in this course to start listening"
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
            <Text style={styles.sectionTitle}>
              {podcasts.length} {podcasts.length === 1 ? 'Podcast' : 'Podcasts'}
            </Text>

            {podcasts.map((podcast) => (
              <TouchableOpacity
                key={podcast.id}
                style={styles.podcastCard}
                onPress={() => handlePodcastPress(podcast)}
                activeOpacity={0.7}
              >
                <View style={styles.podcastIcon}>
                  <Ionicons name="mic" size={24} color={colors.primary} />
                </View>
                
                <View style={styles.podcastInfo}>
                  <Text style={styles.podcastTitle} numberOfLines={2}>
                    {podcast.lessonTitle}
                  </Text>
                  <View style={styles.podcastMeta}>
                    <Text style={styles.podcastMetaText}>
                      {formatDuration(podcast.durationMs)}
                    </Text>
                    <Text style={styles.podcastMetaText}>•</Text>
                    <Text style={styles.podcastMetaText}>
                      {formatDate(podcast.createdAt)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => handlePodcastPress(podcast)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-circle" size={40} color={colors.primary} />
                </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  title: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  podcastIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  podcastInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  podcastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  podcastMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  podcastMetaText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  playButton: {
    padding: spacing.xs,
  },
});
