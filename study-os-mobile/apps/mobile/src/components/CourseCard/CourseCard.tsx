import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../ui/tokens';
import { CourseWithMeta } from '../../types/course';

interface CourseCardProps {
  course: CourseWithMeta;
  onPress: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onPress }) => {
  const accentColor = course.color || colors.primary;
  
  // Format last opened time
  const formatLastOpened = (date: Date | null | undefined): string => {
    if (!date) return 'Never opened';
    
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
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Accent strip */}
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      
      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        
        <Text style={styles.subtitle}>
          {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
          {' • '}
          Last opened {formatLastOpened(course.lastOpenedAt)}
        </Text>
        
        {course.term && (
          <Text style={styles.term}>{course.term}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.none,
  },
  accent: {
    width: 2,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  term: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    letterSpacing: 0,
  },
});
