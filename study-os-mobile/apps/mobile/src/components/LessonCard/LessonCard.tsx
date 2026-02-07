import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../ui/tokens';
import { LessonWithOutputs, LessonStatusLabels, LessonStatusColors } from '../../types/lesson';

interface LessonCardProps {
  lesson: LessonWithOutputs;
  onPress: () => void;
  onLongPress?: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({ lesson, onPress, onLongPress }) => {
  // Format created-at time (relative)
  const formatCreatedAt = (date: Date | null | undefined): string => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };
  
  const statusColor = LessonStatusColors[lesson.status];
  const hasOutputs = lesson.hasSummary || lesson.hasFlashcards || lesson.hasQuiz || lesson.hasVideo;
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {lesson.title}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {LessonStatusLabels[lesson.status]}
            </Text>
          </View>
        </View>
        
        <Text style={styles.subtitle}>
          Created {formatCreatedAt(lesson.createdAt)}
        </Text>
        
        {hasOutputs && (
          <View style={styles.outputIcons}>
            {lesson.hasSummary && (
              <Ionicons name="document-text-outline" size={16} color={colors.textTertiary} style={styles.outputIcon} />
            )}
            {lesson.hasFlashcards && (
              <Ionicons name="layers-outline" size={16} color={colors.textTertiary} style={styles.outputIcon} />
            )}
            {lesson.hasQuiz && (
              <Ionicons name="help-circle-outline" size={16} color={colors.textTertiary} style={styles.outputIcon} />
            )}
            {lesson.hasVideo && (
              <Ionicons name="videocam-outline" size={16} color={colors.textTertiary} style={styles.outputIcon} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  content: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs + 2,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginRight: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  outputIcons: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  outputIcon: {
    marginRight: spacing.sm,
  },
});
