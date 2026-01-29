import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { colors } from '../../ui/tokens';

interface VideoPlayerScreenProps {
  route: {
    params: {
      videoUrl: string;
      lessonTitle: string;
    };
  };
  navigation: any;
}

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
  route,
  navigation,
}) => {
  const { videoUrl, lessonTitle } = route.params;
  const video = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure audio and orientation on mount
  useEffect(() => {
    const setupPlayer = async () => {
      try {
        // Configure audio session for playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        // Unlock all orientations for video playback
        await ScreenOrientation.unlockAsync();
        
        console.log('[VideoPlayer] Audio and orientation configured');
      } catch (err) {
        console.error('[VideoPlayer] Setup error:', err);
      }
    };

    setupPlayer();

    // Cleanup: lock to portrait when leaving
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
    }
  };

  const handleError = (error: string) => {
    console.error('[VideoPlayer] Error:', error);
    setError('Failed to load video');
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {lessonTitle}
          </Text>
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  setIsLoading(true);
                  video.current?.loadAsync({ uri: videoUrl });
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Video
              ref={video}
              source={{ uri: videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onError={handleError}
              shouldPlay={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
