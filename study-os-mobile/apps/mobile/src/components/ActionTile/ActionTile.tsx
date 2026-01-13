import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../ui/tokens';

interface ActionTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  badge?: 'Generate' | 'Open';
  disabled?: boolean;
  onPress: () => void;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  label,
  subtitle,
  badge,
  disabled,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.tile, disabled && styles.tileDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={24}
            color={disabled ? colors.textTertiary : colors.textPrimary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, disabled && styles.labelDisabled]} numberOfLines={2}>
          {label}
        </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    aspectRatio: 1,
    padding: spacing.md,
    position: 'relative',
  },
  tileDisabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xs,
  },
  textContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.1,
    lineHeight: 16,
    textAlign: 'center',
  },
  labelDisabled: {
    color: colors.textTertiary,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.textTertiary,
    letterSpacing: 0,
    lineHeight: 13,
    textAlign: 'center',
    marginTop: 2,
  },
});
