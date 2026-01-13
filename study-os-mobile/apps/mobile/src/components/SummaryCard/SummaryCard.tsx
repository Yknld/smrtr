import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../ui/tokens';

interface SummaryCardProps {
  hasSummary: boolean;
  summaryPreview?: string;
  onOpen?: () => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  hasSummary,
  summaryPreview,
  onOpen,
  onGenerate,
  isGenerating,
}) => {
  if (hasSummary && summaryPreview) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.headerText}>Summary</Text>
        </View>
        <Text style={styles.preview} numberOfLines={4}>
          {summaryPreview}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onOpen} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Open</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.ctaContent}>
        <View style={styles.ctaIcon}>
          <Ionicons name="sparkles-outline" size={24} color={colors.textSecondary} />
        </View>
        <View style={styles.ctaText}>
          <Text style={styles.ctaTitle}>Generate Summary</Text>
          <Text style={styles.ctaSubtitle}>
            Get an AI-generated summary of this lesson
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.ctaButton, isGenerating && styles.ctaButtonDisabled]}
        onPress={onGenerate}
        disabled={isGenerating}
        activeOpacity={0.7}
      >
        <Text style={styles.ctaButtonText}>
          {isGenerating ? 'Generating...' : 'Generate'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.xs + 2,
    letterSpacing: 0,
  },
  preview: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.xs,
    letterSpacing: -0.1,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  ctaIcon: {
    marginRight: spacing.sm + 2,
    marginTop: 2,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  ctaSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
    letterSpacing: 0,
  },
});
