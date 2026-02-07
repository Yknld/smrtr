import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../../ui/tokens';

export type QuestionSource = 'ai' | 'photo';

interface InteractiveQuestionsModalProps {
  visible: boolean;
  onClose: () => void;
  onUseAIGenerated: () => void;
  onUsePhoto: (imageBase64: string, mimeType: string) => void;
}

export const InteractiveQuestionsModal: React.FC<InteractiveQuestionsModalProps> = ({
  visible,
  onClose,
  onUseAIGenerated,
  onUsePhoto,
}) => {
  const [loading, setLoading] = useState(false);

  const handleUseAI = () => {
    onClose();
    onUseAIGenerated();
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take a photo of your questions.');
        return;
      }
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) {
        setLoading(false);
        return;
      }
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      onClose();
      onUsePhoto(asset.base64, mimeType);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to take photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to select an image.');
        return;
      }
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        base64: true,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets?.[0]?.base64) {
        setLoading(false);
        return;
      }
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      onClose();
      onUsePhoto(asset.base64, mimeType);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to select image.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoOption = () => {
    Alert.alert(
      'Questions from photo',
      'Take a photo of your questions or choose one from your library. Include 1–5 questions; if there are more, we\'ll use the 5 hardest.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take photo', onPress: handleTakePhoto },
        { text: 'Choose from library', onPress: handleSelectFromLibrary },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Practice questions</Text>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Use AI-generated questions from your lesson, or provide your own by taking or selecting a photo of 1–5 questions.
            </Text>

            <TouchableOpacity
              style={styles.option}
              onPress={handleUseAI}
              disabled={loading}
            >
              <Ionicons name="sparkles-outline" size={22} color={colors.textPrimary} />
              <Text style={styles.optionLabel}>Use AI-generated questions</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={handlePhotoOption}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons name="camera-outline" size={22} color={colors.textPrimary} />
              )}
              <Text style={styles.optionLabel}>Take or select photo of questions</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <Text style={styles.hint}>
              Photo can contain 1–5 questions. If you provide more than 5, we'll pick the 5 hardest.
            </Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modal: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
});
