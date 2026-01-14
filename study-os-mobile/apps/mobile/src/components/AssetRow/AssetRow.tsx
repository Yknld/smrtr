import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../ui/tokens';

type AssetKind = 'notes' | 'pdf' | 'slides' | 'image' | 'audio' | 'other';

interface Asset {
  id: string;
  kind: AssetKind;
  filename: string;
  mime_type: string;
  storage_path: string;
  duration_ms?: number;
  created_at: string;
}

interface YouTubeResource {
  id: string;
  video_id: string;
  title: string;
  channel_name: string;
  duration_seconds: number;
  is_primary: boolean;
  added_at: string;
}

interface AssetRowProps {
  asset?: Asset;
  youtubeResource?: YouTubeResource;
  onPress: () => void;
  onDelete: () => void;
}

export const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  youtubeResource,
  onPress,
  onDelete,
}) => {
  // Determine icon based on asset kind or YouTube
  const getIcon = (): string => {
    if (youtubeResource) return 'logo-youtube';
    if (!asset) return 'document-outline';
    
    switch (asset.kind) {
      case 'notes':
        return 'document-text-outline';
      case 'pdf':
        return 'document-outline';
      case 'slides':
        return 'albums-outline';
      case 'image':
        return 'image-outline';
      case 'audio':
        return 'musical-note-outline';
      default:
        return 'document-outline';
    }
  };

  // Get icon color based on type
  const getIconColor = (): string => {
    if (youtubeResource) return '#FF0000'; // YouTube red
    if (!asset) return colors.textSecondary;
    
    switch (asset.kind) {
      case 'audio':
        return colors.accentPurple;
      case 'image':
        return colors.accentPink;
      default:
        return colors.textSecondary;
    }
  };

  // Format file size or duration
  const getMetadata = (): string => {
    if (youtubeResource) {
      const minutes = Math.floor(youtubeResource.duration_seconds / 60);
      return `${minutes}m • ${youtubeResource.channel_name}`;
    }
    
    if (!asset) return '';
    
    // Format date
    const date = new Date(asset.created_at);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    
    // Add duration for audio
    if (asset.duration_ms) {
      const minutes = Math.floor(asset.duration_ms / 60000);
      const seconds = Math.floor((asset.duration_ms % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')} • ${formattedDate}`;
    }
    
    // Add file type for others
    const extension = asset.mime_type.split('/')[1]?.toUpperCase() || asset.kind.toUpperCase();
    return `${extension} • ${formattedDate}`;
  };

  const displayName = youtubeResource?.title || asset?.filename || 'Unknown';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name={getIcon() as any} size={20} color={getIconColor()} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.filename} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.metadata} numberOfLines={1}>
            {getMetadata()}
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  filename: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  metadata: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  deleteButton: {
    padding: spacing.sm,
    marginRight: -spacing.sm,
  },
});
