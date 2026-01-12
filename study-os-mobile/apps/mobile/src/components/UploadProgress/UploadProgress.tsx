import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../ui/tokens';

interface UploadProgressProps {
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  filename,
  progress,
  status,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
      case 'error':
        return <Ionicons name="close-circle" size={20} color={colors.error} />;
      default:
        return <ActivityIndicator size="small" color={colors.primary} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'processing':
        return 'Processing...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon/Spinner */}
        <View style={styles.iconContainer}>
          {getStatusIcon()}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.filename} numberOfLines={1}>
            {filename}
          </Text>
          <Text
            style={[
              styles.status,
              status === 'error' && styles.statusError,
            ]}
          >
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      {(status === 'uploading' || status === 'processing') && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress}%` },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 20,
    height: 20,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  filename: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  statusError: {
    color: colors.error,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
