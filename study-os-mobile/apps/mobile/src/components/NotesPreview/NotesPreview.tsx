import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../ui/tokens';

interface NotesPreviewProps {
  content?: string;
  onOpenFull?: () => void;
}

export const NotesPreview: React.FC<NotesPreviewProps> = ({
  content,
  onOpenFull,
}) => {
  const hasContent = content && content.trim().length > 0;
  
  // Get preview text (first 3 lines or first 150 chars)
  const getPreviewText = () => {
    if (!content) return '';
    
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const previewLines = lines.slice(0, 3).join('\n');
    
    if (previewLines.length > 150) {
      return previewLines.substring(0, 150) + '...';
    }
    
    return previewLines;
  };

  const previewText = getPreviewText();
  const hasMore = content && content.length > previewText.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notes</Text>
      </View>
      
      {hasContent ? (
        <TouchableOpacity
          style={styles.notesCard}
          onPress={onOpenFull}
          activeOpacity={0.7}
          disabled={!onOpenFull}
        >
          <Text style={styles.content} numberOfLines={3}>
            {previewText}
          </Text>
          {hasMore && (
            <View style={styles.readMoreContainer}>
              <Text style={styles.readMoreText}>Read more</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a transcription or add assets to build notes.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.sm,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  notesCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  content: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  readMoreContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  emptyState: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
