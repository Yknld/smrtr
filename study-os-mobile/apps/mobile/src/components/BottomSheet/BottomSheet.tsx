import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../ui/tokens';

export interface BottomSheetAction {
  label: string;
  subtitle?: string;
  icon?: string;
  onPress: () => void;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: BottomSheetAction[];
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  actions,
  title,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Handle */}
              <View style={styles.handle} />
              
              {/* Title (optional) */}
              {title && (
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                </View>
              )}
              
              {/* Actions */}
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.action,
                    index === actions.length - 1 && styles.actionLast,
                  ]}
                  onPress={() => {
                    action.onPress();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  {action.icon && (
                    <Ionicons
                      name={action.icon as any}
                      size={20}
                      color={colors.textSecondary}
                      style={styles.actionIcon}
                    />
                  )}
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    {action.subtitle && (
                      <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* Cancel */}
              <TouchableOpacity
                style={styles.cancel}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </TouchableOpacity>
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
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    ...shadows.elevated,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderDark,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    marginRight: spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  titleContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  cancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0,
  },
});
