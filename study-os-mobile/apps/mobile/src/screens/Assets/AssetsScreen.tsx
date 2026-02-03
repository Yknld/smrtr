import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import RNFS from 'react-native-fs';
import { decode as atob } from 'base-64';
import { colors, spacing, borderRadius, typography } from '../../ui/tokens';
import { AssetRow } from '../../components/AssetRow/AssetRow';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { BottomSheet, BottomSheetAction } from '../../components/BottomSheet/BottomSheet';
import { UploadProgress } from '../../components/UploadProgress/UploadProgress';
import { supabase, SUPABASE_URL } from '../../config/supabase';

interface AssetsScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
    };
  };
  navigation: any;
}

// Asset types matching database schema
export type AssetKind = 'notes' | 'pdf' | 'slides' | 'image' | 'audio' | 'video' | 'other';

export interface Asset {
  id: string;
  kind: AssetKind;
  filename: string;
  mime_type: string;
  storage_path: string;
  duration_ms?: number;
  created_at: string;
}

export interface YouTubeResource {
  id: string;
  video_id: string;
  title: string;
  channel_name: string;
  duration_seconds: number;
  is_primary: boolean;
  added_at: string;
}

// Group assets by kind
interface GroupedAssets {
  notes: Asset[];
  pdfs: Asset[];
  slides: Asset[];
  images: Asset[];
  audio: Asset[];
  videos: Asset[];
  youtube: YouTubeResource[];
}

interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({ route, navigation }) => {
  const { lessonId, lessonTitle } = route.params;
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<GroupedAssets>({
    notes: [],
    pdfs: [],
    slides: [],
    images: [],
    audio: [],
    videos: [],
    youtube: [],
  });
  const [uploadMenuVisible, setUploadMenuVisible] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch assets from database
  useEffect(() => {
    fetchAssets();
  }, [lessonId]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      // Fetch assets from Supabase (only ones that are ready - have storage_path)
      const { data: assetData, error: assetError } = await supabase
        .from('lesson_assets')
        .select('*')
        .eq('lesson_id', lessonId)
        .not('storage_path', 'is', null)
        .order('created_at', { ascending: false });

      if (assetError) throw assetError;

      // Group assets by kind
      const grouped: GroupedAssets = {
        notes: [],
        pdfs: [],
        slides: [],
        images: [],
        audio: [],
        videos: [],
        youtube: [],
      };

      if (assetData) {
        console.log('[Assets] Fetched assets:', assetData.length, 'items');
        console.log('[Assets] Asset kinds:', assetData.map((a: any) => a.kind));
        
        assetData.forEach((asset: any) => {
          // Skip assets without storage_path (shouldn't happen with query filter, but be safe)
          if (!asset.storage_path) {
            console.log('[Assets] Skipping asset without storage_path:', asset.id, asset.kind);
            return;
          }
          
          const assetItem: Asset = {
            id: asset.id,
            kind: asset.kind,
            filename: asset.storage_path.split('/').pop() || 'Unknown',
            mime_type: asset.mime_type,
            storage_path: asset.storage_path,
            duration_ms: asset.duration_ms,
            created_at: asset.created_at,
          };

          if (asset.kind === 'notes') {
            grouped.notes.push(assetItem);
          } else if (asset.kind === 'pdf') {
            grouped.pdfs.push(assetItem);
          } else if (asset.kind === 'slides') {
            grouped.slides.push(assetItem);
          } else if (asset.kind === 'image') {
            grouped.images.push(assetItem);
          } else if (asset.kind === 'audio') {
            grouped.audio.push(assetItem);
          } else if (asset.kind === 'video') {
            console.log('[Assets] Adding video:', asset.id, asset.storage_path);
            grouped.videos.push(assetItem);
          }
        });
      }
      
      console.log('[Assets] Grouped assets - Videos:', grouped.videos.length);

      // Fetch lesson notes from lesson_outputs
      const { data: notesData, error: notesError } = await supabase
        .from('lesson_outputs')
        .select('id, notes_final_text, notes_raw_text, updated_at')
        .eq('lesson_id', lessonId)
        .eq('type', 'notes')
        .single();

      // If notes exist in lesson_outputs, add them to notes section
      if (!notesError && notesData) {
        const notesText = notesData.notes_final_text || notesData.notes_raw_text;
        if (notesText && notesText.trim()) {
          grouped.notes.push({
            id: notesData.id,
            kind: 'notes',
            filename: 'Lesson Notes',
            mime_type: 'text/plain',
            storage_path: '', // Notes from lesson_outputs don't have storage path
            created_at: notesData.updated_at,
          });
        }
      }

      // Fetch YouTube resources
      const { data: youtubeData, error: youtubeError } = await supabase
        .from('youtube_lesson_resources')
        .select(`
          lesson_id,
          video_id,
          is_primary,
          added_at,
          youtube_videos (
            video_id,
            title,
            channel_name,
            duration_seconds
          )
        `)
        .eq('lesson_id', lessonId)
        .order('added_at', { ascending: false });

      if (!youtubeError && youtubeData) {
        grouped.youtube = youtubeData.map((item: any) => ({
          id: item.video_id,
          video_id: item.video_id,
          title: item.youtube_videos.title,
          channel_name: item.youtube_videos.channel_name,
          duration_seconds: item.youtube_videos.duration_seconds,
          is_primary: item.is_primary,
          added_at: item.added_at,
        }));
      }

      setAssets(grouped);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      
      // Show error message only if it's not a network timeout during initial load
      const errorMessage = error.message?.includes('network')
        ? 'Network error. Please check your connection and try again.'
        : error.message?.includes('timeout')
        ? 'Request timed out. Please try again.'
        : 'Failed to load assets. Pull down to refresh.';
      
      // Only show alert if not already loading (prevents error spam on refresh)
      if (!loading) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Upload menu actions
  const uploadActions: BottomSheetAction[] = [
    {
      label: 'Upload PDF',
      icon: 'document-text-outline',
      onPress: () => {
        setUploadMenuVisible(false);
        handleUpload('pdf');
      },
    },
    {
      label: 'Upload Slides',
      icon: 'albums-outline',
      onPress: () => {
        setUploadMenuVisible(false);
        handleUpload('slides');
      },
    },
    {
      label: 'Upload Images',
      icon: 'image-outline',
      onPress: () => {
        setUploadMenuVisible(false);
        handleUpload('image');
      },
    },
    {
      label: 'Upload Audio',
      icon: 'mic-outline',
      onPress: () => {
        setUploadMenuVisible(false);
        handleUpload('audio');
      },
    },
    {
      label: 'Add YouTube Link',
      icon: 'logo-youtube',
      onPress: () => {
        setUploadMenuVisible(false);
        handleAddYouTubeLink();
      },
    },
  ];

  const handleUpload = async (kind: AssetKind) => {
    // Prevent multiple simultaneous uploads
    if (isUploading) {
      return;
    }

    setIsUploading(true);
    try {
      if (kind === 'image') {
        await handleImageUpload();
      } else {
        await handleDocumentUpload(kind);
      }
    } catch (error: any) {
      // Only log and alert for actual errors, not user cancellations
      if (error.message !== 'User cancelled') {
        console.error('Upload error:', error);
        Alert.alert('Upload Failed', 'Failed to upload file. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled) {
        throw new Error('User cancelled');
      }

      // Upload all selected images
      for (const asset of result.assets) {
        await uploadFile(asset.uri, asset.fileName || 'image.jpg', 'image', asset.mimeType || 'image/jpeg');
      }
    } catch (error: any) {
      // Re-throw to be handled by parent
      throw error;
    }
  };

  const handleDocumentUpload = async (kind: AssetKind) => {
    try {
      // Define MIME types for each kind
      const mimeTypes: Record<AssetKind, string[]> = {
        pdf: ['application/pdf'],
        slides: [
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.oasis.opendocument.presentation',
        ],
        audio: ['audio/*'],
        notes: ['text/*', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        image: ['image/*'],
        other: ['*/*'],
      };

      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes[kind] || '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        throw new Error('User cancelled');
      }

      const file = result.assets[0];
      await uploadFile(file.uri, file.name, kind, file.mimeType || 'application/octet-stream');
    } catch (error: any) {
      // Re-throw to be handled by parent
      throw error;
    }
  };

  const uploadFile = async (uri: string, filename: string, kind: AssetKind, mimeType: string) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload files.');
      return;
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storagePath = `${user.id}/${lessonId}/${uniqueFilename}`;

    // Create upload item
    const uploadId = Math.random().toString(36).substring(7);
    const uploadItem: UploadItem = {
      id: uploadId,
      filename,
      progress: 0,
      status: 'uploading',
    };

    setUploads((prev) => [...prev, uploadItem]);

    try {
      // Read file as base64
      const cleanUri = uri.replace('file://', '');
      const base64Data = await RNFS.readFile(cleanUri, 'base64');
      
      // Convert base64 to ArrayBuffer (works better in React Native)
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage (accepts ArrayBuffer)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson-assets')
        .upload(storagePath, bytes.buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update progress to processing
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadId ? { ...item, progress: 100, status: 'processing' } : item
        )
      );

      // Create database record and get id for notes update
      const { data: insertedAsset, error: dbError } = await supabase
        .from('lesson_assets')
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          kind,
          storage_bucket: 'lesson-assets',
          storage_path: storagePath,
          mime_type: mimeType,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Append this asset to the lesson notes (fire-and-forget)
      if (insertedAsset?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/notes_append_from_asset`;
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ lesson_id: lessonId, asset_id: insertedAsset.id }),
        }).catch((err) => console.warn('notes_append_from_asset:', err?.message));
      }

      // Update to complete
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadId ? { ...item, status: 'complete' } : item
        )
      );

      // Remove from uploads after a delay
      setTimeout(() => {
        setUploads((prev) => prev.filter((item) => item.id !== uploadId));
      }, 2000);

      // Refresh assets
      await fetchAssets();
    } catch (error: any) {
      console.error('File upload error:', error);
      
      // Update upload status to error
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadId ? { ...item, status: 'error' } : item
        )
      );

      // Remove failed upload after delay
      setTimeout(() => {
        setUploads((prev) => prev.filter((item) => item.id !== uploadId));
      }, 3000);

      // Show user-friendly error message
      const errorMessage = error.message?.includes('Storage')
        ? 'Storage upload failed. Please check your connection and try again.'
        : error.message?.includes('Database')
        ? 'Failed to save asset information. Please try again.'
        : 'Failed to upload file. Please try again.';
      
      Alert.alert('Upload Error', errorMessage);
      throw error;
    }
  };

  const handleAddYouTubeLink = () => {
    // TODO: Navigate to YouTube link input screen
    console.log('Add YouTube link');
  };

  const handleAssetPress = (asset: Asset) => {
    // Handle notes specially - navigate to notes view in Lesson Hub
    if (asset.kind === 'notes') {
      navigation.goBack(); // Go back to Lesson Hub where notes are displayed
      return;
    }
    
    // TODO: Open asset viewer/player for other types
    console.log('Open asset:', asset);
  };

  const handleYouTubePress = (resource: YouTubeResource) => {
    // TODO: Open YouTube player
    console.log('Open YouTube:', resource);
  };

  const handleAssetDelete = async (assetId: string) => {
    Alert.alert(
      'Delete Asset',
      'Are you sure you want to delete this asset?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the asset to get storage path
              const allAssets = [
                ...assets.notes,
                ...assets.pdfs,
                ...assets.slides,
                ...assets.images,
                ...assets.audio,
                ...assets.videos,
              ];
              const asset = allAssets.find((a) => a.id === assetId);

              if (!asset) {
                Alert.alert('Error', 'Asset not found.');
                return;
              }

              // Handle notes deletion separately (stored in lesson_outputs)
              if (asset.kind === 'notes') {
                const { error: notesError } = await supabase
                  .from('lesson_outputs')
                  .delete()
                  .eq('id', assetId)
                  .eq('type', 'notes');

                if (notesError) {
                  throw new Error(`Failed to delete notes: ${notesError.message}`);
                }
              } else {
                // Delete regular assets from storage
                if (asset.storage_path) {
                  const { error: storageError } = await supabase.storage
                    .from('lesson-assets')
                    .remove([asset.storage_path]);

                  if (storageError) {
                    console.warn('Storage delete warning:', storageError);
                    // Continue even if storage delete fails (file might already be gone)
                  }
                }

                // Delete from database
                const { error: dbError } = await supabase
                  .from('lesson_assets')
                  .delete()
                  .eq('id', assetId);

                if (dbError) {
                  throw new Error(`Database error: ${dbError.message}`);
                }
              }

              // Refresh assets
              await fetchAssets();
            } catch (error: any) {
              console.error('Delete error:', error);
              Alert.alert(
                'Delete Failed',
                error.message || 'Failed to delete asset. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const getTotalAssets = () => {
    return (
      assets.notes.length +
      assets.pdfs.length +
      assets.slides.length +
      assets.images.length +
      assets.audio.length +
      assets.videos.length +
      assets.youtube.length
    );
  };

  const isEmpty = getTotalAssets() === 0;

  // Render section if it has assets
  const renderSection = (
    title: string,
    items: Asset[] | YouTubeResource[],
    isYouTube: boolean = false
  ) => {
    if (items.length === 0) return null;

    console.log(`[Assets] Rendering section "${title}" with ${items.length} items`);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {items.map((item) => (
          <AssetRow
            key={item.id}
            asset={isYouTube ? undefined : (item as Asset)}
            youtubeResource={isYouTube ? (item as YouTubeResource) : undefined}
            onPress={() =>
              isYouTube
                ? handleYouTubePress(item as YouTubeResource)
                : handleAssetPress(item as Asset)
            }
            onDelete={() => handleAssetDelete(item.id)}
          />
        ))}
      </View>
    );
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
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.title}>Assets</Text>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => !isUploading && setUploadMenuVisible(true)}
            activeOpacity={0.7}
            disabled={isUploading}
          >
            <Ionicons 
              name="cloud-upload-outline" 
              size={24} 
              color={isUploading ? colors.textTertiary : colors.textPrimary} 
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isEmpty ? (
          <EmptyState
            icon="folder-open-outline"
            title="No assets yet"
            subtitle="Add your first source to get started"
            actionLabel="Upload Asset"
            onAction={() => setUploadMenuVisible(true)}
          />
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Upload Progress */}
            {uploads.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Uploading</Text>
                {uploads.map((upload) => (
                  <UploadProgress
                    key={upload.id}
                    filename={upload.filename}
                    progress={upload.progress}
                    status={upload.status}
                  />
                ))}
              </View>
            )}

            {/* Asset Sections - Videos first! */}
            {renderSection('Videos', assets.videos)}
            {renderSection('Notes', assets.notes)}
            {renderSection('PDFs', assets.pdfs)}
            {renderSection('Slides', assets.slides)}
            {renderSection('Images', assets.images)}
            {renderSection('Audio', assets.audio)}
            {renderSection('YouTube Links', assets.youtube, true)}
          </ScrollView>
        )}

        {/* Upload Menu */}
        <BottomSheet
          visible={uploadMenuVisible}
          onClose={() => setUploadMenuVisible(false)}
          actions={uploadActions}
        />
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  uploadButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
});
