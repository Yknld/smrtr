import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Animated,
  ScrollView,
  PanResponder,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors, spacing, borderRadius } from '../../ui/tokens';
import {
  createPodcastEpisode,
  fetchPodcastEpisode,
  fetchPodcastSegments,
  generatePodcastScript,
  generatePodcastAudio,
  getCachedPodcast,
  clearPodcastCache,
  joinInPodcast,
  PodcastEpisode,
  PodcastSegment,
  PodcastStatus,
} from '../../data/podcasts.repository';
import { supabase } from '../../config/supabase';
import { AssemblyLiveService, TranscriptEvent } from '../../services/assemblyLive';

interface PodcastPlayerScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
      podcastUrl?: string;
      podcastAvailable?: boolean;
    };
  };
  navigation: any;
}

export const PodcastPlayerScreen: React.FC<PodcastPlayerScreenProps> = ({ route, navigation }) => {
  const { lessonId, lessonTitle, podcastUrl, podcastAvailable = false } = route.params;
  
  // Podcast episode state
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [segments, setSegments] = useState<PodcastSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLiked, setIsLiked] = useState<boolean | null>(null);
  const [isInLiveSession, setIsInLiveSession] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  
  // Audio player state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [nextSound, setNextSound] = useState<Audio.Sound | null>(null); // Preloaded next segment
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [segmentDurations, setSegmentDurations] = useState<number[]>([]); // Duration of each segment in seconds
  
  // Animation for play button
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for listening pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Ref to throttle time updates (prevent re-renders on every frame)
  const lastTimeUpdateRef = useRef(0);
  const UPDATE_INTERVAL_MS = 500; // Update UI every 500ms
  
  // Ref for transcript scrolling
  const transcriptScrollRef = useRef<ScrollView>(null);
  const segmentRefs = useRef<Map<number, View>>(new Map());
  
  // Join-in state
  const [showJoinInModal, setShowJoinInModal] = useState(false);
  const [joinInInput, setJoinInInput] = useState('');
  const [isJoinInLoading, setIsJoinInLoading] = useState(false);
  const [joinInSegments, setJoinInSegments] = useState<PodcastSegment[]>([]);
  const [isPlayingJoinIn, setIsPlayingJoinIn] = useState(false);
  const [wasPlayingBeforeJoinIn, setWasPlayingBeforeJoinIn] = useState(false);
  
  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const assemblyServiceRef = useRef<AssemblyLiveService | null>(null);
  const joinInTranscriptScrollRef = useRef<ScrollView>(null);
  
  // Debug: Log button state
  useEffect(() => {
    const canSend = joinInInput.trim() && !isJoinInLoading && !isListening;
    console.log(`🔘 Send button state: ${canSend ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   - Text: "${joinInInput}" (${joinInInput.length} chars)`);
    console.log(`   - Loading: ${isJoinInLoading}`);
    console.log(`   - Listening: ${isListening}`);
  }, [joinInInput, isJoinInLoading, isListening]);
  
  // Auto-scroll join-in transcript when text changes
  useEffect(() => {
    if ((joinInInput || partialTranscript) && joinInTranscriptScrollRef.current) {
      setTimeout(() => {
        joinInTranscriptScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [joinInInput, partialTranscript]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = async () => {
    console.log('🎵 togglePlayPause called');
    console.log('   - sound:', sound ? 'loaded' : 'null');
    console.log('   - isPlaying:', isPlaying);
    console.log('   - audioUrls length:', audioUrls.length);
    console.log('   - currentSegmentIndex:', currentSegmentIndex);
    
    try {
      if (!sound) {
        console.log('❌ No audio loaded yet - cannot play');
        console.log('   Debug: audioUrls[0]:', audioUrls[0]?.substring(0, 100));
        return;
      }

      // Check sound status before playing
      const soundStatus = await sound.getStatusAsync();
      console.log('🔍 Sound status before play:', JSON.stringify(soundStatus, null, 2));

      // Animate button
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (isPlaying) {
        console.log('⏸️ Pausing...');
        await sound.pauseAsync();
        setIsPlaying(false);
        console.log('✅ Paused');
      } else {
        console.log('▶️ Playing...');
        
        // Ensure volume is at 1.0
        await sound.setVolumeAsync(1.0);
        console.log('🔊 Volume set to 1.0');
        
        const status = await sound.playAsync();
        console.log('📊 Play status:', JSON.stringify({
          isLoaded: status.isLoaded,
          isPlaying: status.isPlaying,
          positionMillis: status.positionMillis,
          durationMillis: status.durationMillis,
          volume: status.volume,
        }, null, 2));
        
        setIsPlaying(true);
        console.log('✅ Set to playing state');
      }
    } catch (error) {
      console.error('❌ Error toggling playback:', error);
      console.error('   Error details:', JSON.stringify(error, null, 2));
    }
  };

  const cyclePlaybackRate = async () => {
    const rates = [1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    
    // Update audio player rate (with pitch correction to prevent chipmunk effect)
    if (sound) {
      try {
        await sound.setRateAsync(nextRate, true, Audio.PitchCorrectionQuality.High);
      } catch (error) {
        console.error('Error setting playback rate:', error);
      }
    }
  };

  const skipBackward = async () => {
    if (!sound || audioUrls.length === 0) {
      console.log('Cannot skip: audio not loaded');
      return;
    }
    const newTime = Math.max(0, currentTime - 15);
    await seekToTime(newTime);
  };

  const skipForward = async () => {
    if (!sound || audioUrls.length === 0) {
      console.log('Cannot skip: audio not loaded');
      return;
    }
    const newTime = Math.min(duration, currentTime + 15);
    await seekToTime(newTime);
  };

  const handleLike = () => {
    setIsLiked(isLiked === true ? null : true);
    // TODO: Save preference to backend
  };

  const handleDislike = () => {
    setIsLiked(isLiked === false ? null : false);
    // TODO: Save preference to backend
  };

  const handleJoinMic = async () => {
    // Save current playing state
    setWasPlayingBeforeJoinIn(isPlaying);
    
    // Pause podcast when opening join-in modal
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
    
    // Reset state
    setJoinInInput('');
    setPartialTranscript('');
    setShowJoinInModal(true);
    
    // DON'T auto-start - let user press Start button
    // This gives them time to prepare and see the UI
  };

  const handleTranscriptEvent = useCallback((event: TranscriptEvent) => {
    switch (event.type) {
      case 'connected':
        console.log('✅ AssemblyAI connected');
        break;
      
      case 'partial':
        if (event.text) {
          console.log('📝 Partial:', event.text);
          setPartialTranscript(event.text);
        }
        break;
      
      case 'final':
        if (event.text) {
          console.log('✅ Final:', event.text);
          // Append final text to input
          setJoinInInput(prev => {
            const newText = prev ? `${prev} ${event.text}` : event.text;
            console.log('💬 Accumulated text:', newText);
            return newText;
          });
          setPartialTranscript('');
        }
        break;
      
      case 'error':
        console.error('❌ Transcription error:', event.error);
        alert(`Transcription error: ${event.error}`);
        stopListening();
        break;
      
      case 'disconnected':
        console.log('🔌 AssemblyAI disconnected');
        // When disconnected, move any remaining partial text to final
        setPartialTranscript(prev => {
          if (prev) {
            console.log('📦 Moving partial to final on disconnect:', prev);
            setJoinInInput(current => current ? `${current} ${prev}` : prev);
          }
          return '';
        });
        break;
    }
  }, []);

  const startListening = async () => {
    try {
      console.log('🎤 Starting voice input...');
      setIsListening(true);
      
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Microphone permission is required for voice input');
        setIsListening(false);
        pulseAnim.setValue(1);
        return;
      }

      // Initialize AssemblyAI service
      const service = new AssemblyLiveService(handleTranscriptEvent);
      assemblyServiceRef.current = service;
      
      await service.start();
      console.log('✅ Voice input started');
    } catch (error: any) {
      console.error('Failed to start voice input:', error);
      alert(`Failed to start voice input: ${error.message}`);
      setIsListening(false);
      pulseAnim.setValue(1);
    }
  };

  const stopListening = async () => {
    try {
      console.log('🛑 Stopping voice input...');
      console.log('📊 Current state - joinInInput:', joinInInput, 'partialTranscript:', partialTranscript);
      
      // Move any remaining partial text to final input before stopping
      setPartialTranscript(currentPartial => {
        if (currentPartial) {
          console.log('📦 Saving partial text before stop:', currentPartial);
          setJoinInInput(prev => {
            const newText = prev ? `${prev} ${currentPartial}` : currentPartial;
            console.log('💾 New accumulated text:', newText);
            return newText;
          });
        }
        return '';
      });
      
      if (assemblyServiceRef.current) {
        await assemblyServiceRef.current.stop();
        assemblyServiceRef.current = null;
      }
      
      setIsListening(false);
      
      // Reset pulse animation
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      
      console.log('✅ Voice input stopped');
    } catch (error) {
      console.error('Error stopping voice input:', error);
      setIsListening(false);
      setPartialTranscript('');
      pulseAnim.setValue(1);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleJoinInSubmit = async () => {
    if (!joinInInput.trim() || !episode) {
      return;
    }

    try {
      // Stop listening first
      if (isListening) {
        await stopListening();
      }

      setIsJoinInLoading(true);
      console.log('🎤 Submitting join-in question...');
      console.log('   Episode ID:', episode.id);
      console.log('   Lesson ID:', lessonId);
      console.log('   Episode lesson_id:', episode.lessonId);
      console.log('   Current segment:', currentSegmentIndex);
      console.log('   Question:', joinInInput.trim());

      // Call join-in API - use episode.lessonId if available, fallback to lessonId
      const actualLessonId = episode.lessonId || lessonId;
      console.log('   Using lesson ID:', actualLessonId);
      
      const newSegments = await joinInPodcast(
        episode.id,
        currentSegmentIndex,
        joinInInput.trim(),
        actualLessonId
      );

      setJoinInSegments(newSegments);
      setIsPlayingJoinIn(true);
      setShowJoinInModal(false);
      setJoinInInput('');

      console.log(`✅ Join-in segments created: ${newSegments.length}`);

      // Poll for TTS completion and play
      pollJoinInAudio(newSegments);

    } catch (error: any) {
      console.error('Failed to join in:', error);
      alert(`Failed to join conversation: ${error.message}`);
    } finally {
      setIsJoinInLoading(false);
    }
  };

  const handleCloseJoinInModal = async () => {
    if (isListening) {
      await stopListening();
    }
    setShowJoinInModal(false);
    setJoinInInput('');
    setPartialTranscript('');
    
    // Resume playback if it was playing before modal opened
    if (wasPlayingBeforeJoinIn && sound) {
      try {
        await sound.playAsync();
        setIsPlaying(true);
        console.log('✅ Resumed playback after closing join-in modal');
      } catch (error) {
        console.error('Error resuming playback:', error);
      }
    }
  };

  const pollJoinInAudio = async (joinSegments: PodcastSegment[]) => {
    const maxAttempts = 60; // 60 seconds max wait (TTS can be slow)
    let attempts = 0;

    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        // Check if all segments are ready
        const { data, error } = await supabase
          .from('podcast_segments')
          .select('id, tts_status, audio_path')
          .in('id', joinSegments.map(s => s.id));

        if (error) throw error;

        const readyCount = data?.filter(seg => seg.tts_status === 'ready').length || 0;
        const totalCount = data?.length || 0;
        
        if (attempts % 5 === 0) {
          console.log(`⏳ Polling join-in audio: ${readyCount}/${totalCount} ready (${attempts}s)`);
        }

        const allReady = data?.every(seg => seg.tts_status === 'ready');

        if (allReady) {
          clearInterval(pollInterval);
          console.log('✅ Join-in audio ready, playing...');
          
          // Fetch segments with signed URLs
          const updatedSegments = await fetchPodcastSegments(episode!.id);
          const joinInSegs = updatedSegments.filter(s => 
            joinSegments.some(js => js.id === s.id)
          );

          console.log(`🎵 Playing ${joinInSegs.length} join-in segments`);
          
          // Play join-in segments
          await playJoinInSegments(joinInSegs);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.error(`⏱️ Timeout waiting for join-in audio: ${readyCount}/${totalCount} ready`);
          alert(`Audio generation timed out. ${readyCount}/${totalCount} segments ready. Try a shorter question.`);
          setIsPlayingJoinIn(false);
        }
      } catch (error) {
        console.error('Error polling join-in audio:', error);
      }
    }, 1000);
  };

  const playJoinInSegments = async (joinSegments: PodcastSegment[]) => {
    // TODO: Implement sequential playback of join-in segments
    // For now, just log
    console.log(`🎵 Playing ${joinSegments.length} join-in segments`);
    
    // After playing, resume original podcast
    setTimeout(() => {
      setIsPlayingJoinIn(false);
      console.log('✅ Join-in complete, resuming podcast');
      // Resume playback
      if (sound) {
        sound.playAsync();
        setIsPlaying(true);
      }
    }, 5000); // Placeholder - should be actual audio duration
  };

  const handleDownload = () => {
    // TODO: Download podcast for offline listening
    console.log('Download podcast');
  };

  const seekToTime = async (targetTime: number) => {
    if (!sound || segmentDurations.length === 0 || audioUrls.length === 0) {
      console.log('Cannot seek: sound not ready');
      return;
    }
    
    // Find which segment contains the target time
    let cumulativeTime = 0;
    let targetSegmentIndex = 0;
    let positionInSegment = 0;
    
    for (let i = 0; i < segmentDurations.length; i++) {
      if (cumulativeTime + segmentDurations[i] >= targetTime) {
        targetSegmentIndex = i;
        positionInSegment = targetTime - cumulativeTime;
        break;
      }
      cumulativeTime += segmentDurations[i];
    }
    
    try {
      // Check if sound is actually loaded
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        console.log('Sound not loaded, cannot seek');
        return;
      }
      
      if (targetSegmentIndex === currentSegmentIndex) {
        // Same segment - just seek within it
        await sound.setPositionAsync(positionInSegment * 1000);
      } else {
        // Different segment - need to load it
        setCurrentSegmentIndex(targetSegmentIndex);
        // The useEffect will load the new segment, then we seek
        // Store the seek position temporarily
        setTimeout(async () => {
          if (sound) {
            const newStatus = await sound.getStatusAsync();
            if (newStatus.isLoaded) {
              await sound.setPositionAsync(positionInSegment * 1000);
            }
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const updateProgressFromTouch = (x: number) => {
    if (sliderWidth === 0 || isSeeking) return;
    const clampedX = Math.max(0, Math.min(x, sliderWidth));
    const newProgress = clampedX / sliderWidth;
    const newTime = Math.floor(newProgress * duration);
    setCurrentTime(newTime);
  };

  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        updateProgressFromTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateProgressFromTouch(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: async (evt) => {
        const clampedX = Math.max(0, Math.min(evt.nativeEvent.locationX, sliderWidth));
        const newProgress = clampedX / sliderWidth;
        const newTime = Math.floor(newProgress * duration);
        await seekToTime(newTime);
        setIsSeeking(false);
      },
      onPanResponderTerminate: () => {
        setIsSeeking(false);
      },
    })
  ).current;

  // Configure audio session on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        console.log('🔊 Setting up audio session...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        console.log('✅ Audio session configured');
      } catch (error) {
        console.error('❌ Failed to setup audio:', error);
      }
    };
    setupAudio();
  }, []);

  // Load or create podcast episode
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const loadPodcast = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // Clear cache first to ensure fresh data
        clearPodcastCache(lessonId);
        console.log('🔄 Cache cleared, fetching fresh podcast data...');

        // Check cache first for instant loading (will be empty after clear above)
        const cachedData = getCachedPodcast(lessonId);
        if (cachedData && cachedData.episode) {
          console.log('⚡ Using cached podcast data');
          setEpisode(cachedData.episode);
          
          if (cachedData.segments.length > 0) {
            setSegments(cachedData.segments);
            
            // Calculate durations
            const totalDuration = cachedData.segments.reduce(
              (sum, seg) => sum + (seg.durationMs || 0),
              0
            ) / 1000;
            setDuration(Math.floor(totalDuration));
            
            const durations = cachedData.segments.map(seg => (seg.durationMs || 0) / 1000);
            setSegmentDurations(durations);
            
            // Generate audio URLs
            const urls = cachedData.segments.map(seg => {
              if (seg.audioPath) {
                const { data } = supabase.storage
                  .from('tts_audio')
                  .getPublicUrl(seg.audioPath);
                return data.publicUrl;
              }
              return '';
            }).filter(url => url !== '');
            setAudioUrls(urls);
            
            setIsLoading(false);
            return; // Done - using cached data!
          }
        }

        // No cache or incomplete cache - fetch from server
        const existingEpisode = await fetchPodcastEpisode(lessonId);

        if (existingEpisode) {
          setEpisode(existingEpisode);

          // If ready, load segments
          if (existingEpisode.status === 'ready') {
            const episodeSegments = await fetchPodcastSegments(existingEpisode.id);
            setSegments(episodeSegments);

            // Calculate total duration and segment durations
            const totalDuration = episodeSegments.reduce(
              (sum, seg) => sum + (seg.durationMs || 0),
              0
            ) / 1000; // Convert to seconds
            setDuration(Math.floor(totalDuration));

            // Store individual segment durations
            const durations = episodeSegments.map(seg => (seg.durationMs || 0) / 1000);
            setSegmentDurations(durations);

            // Use signed URLs already generated in fetchPodcastSegments
            // CRITICAL: Don't filter - keep array length same as segments for proper index alignment
            const urls = episodeSegments.map((seg, idx) => {
              if (!seg.signedUrl && seg.ttsStatus === 'ready') {
                console.warn(`⚠️ Segment ${idx} (seq ${seg.seq}) is ready but has no signed URL!`);
                console.warn(`   Bucket: ${seg.audioBucket}, Path: ${seg.audioPath}`);
              }
              return seg.signedUrl || '';
            });
            
            setAudioUrls(urls);
            const readyCount = urls.filter(u => u !== '').length;
            console.log(`✅ Loaded ${readyCount}/${urls.length} audio segments`);
            
            // Debug: Log segments without URLs
            episodeSegments.forEach((seg, idx) => {
              if (!urls[idx] && seg.ttsStatus === 'ready') {
                console.log(`🔍 Missing URL for segment ${idx}: status=${seg.ttsStatus}, bucket=${seg.audioBucket}, path=${seg.audioPath}`);
              }
            });

            setIsLoading(false);
          } else if (existingEpisode.status === 'failed') {
            setLoadError(existingEpisode.error || 'Podcast generation failed');
            setIsLoading(false);
          } else if (existingEpisode.status === 'voicing') {
            // Episode is in voicing status - just poll for updates
            // Audio generation was already triggered when script was generated
            console.log('Episode in voicing status, polling for completion...');

            // Poll for updates
            pollInterval = setInterval(async () => {
              const updated = await fetchPodcastEpisode(lessonId);
              if (updated) {
                setEpisode(updated);
                
                if (updated.status === 'ready') {
                  const episodeSegments = await fetchPodcastSegments(updated.id);
                  setSegments(episodeSegments);

                  // Generate audio URLs
                  const urls = episodeSegments.map(seg => {
                    if (seg.audioPath) {
                      const { data } = supabase.storage
                        .from('tts_audio')
                        .getPublicUrl(seg.audioPath);
                      return data.publicUrl;
                    }
                    return '';
                  }).filter(url => url !== '');
                  setAudioUrls(urls);

                  const totalDuration = episodeSegments.reduce(
                    (sum, seg) => sum + (seg.durationMs || 0),
                    0
                  ) / 1000;
                  setDuration(Math.floor(totalDuration));

                  const durations = episodeSegments.map(seg => (seg.durationMs || 0) / 1000);
                  setSegmentDurations(durations);

                  setIsLoading(false);
                  if (pollInterval) clearInterval(pollInterval);
                } else if (updated.status === 'failed') {
                  setLoadError(updated.error || 'Podcast generation failed');
                  setIsLoading(false);
                  if (pollInterval) clearInterval(pollInterval);
                }
              }
            }, 3000);
          } else {
            // Other statuses (queued, scripting) - just poll
            pollInterval = setInterval(async () => {
              const updated = await fetchPodcastEpisode(lessonId);
              if (updated) {
                setEpisode(updated);
                
                if (updated.status === 'ready') {
                  const episodeSegments = await fetchPodcastSegments(updated.id);
                  setSegments(episodeSegments);

                  const totalDuration = episodeSegments.reduce(
                    (sum, seg) => sum + (seg.durationMs || 0),
                    0
                  ) / 1000;
                  setDuration(Math.floor(totalDuration));

                  const durations = episodeSegments.map(seg => (seg.durationMs || 0) / 1000);
                  setSegmentDurations(durations);

                  setIsLoading(false);
                  if (pollInterval) clearInterval(pollInterval);
                } else if (updated.status === 'failed') {
                  setLoadError(updated.error || 'Podcast generation failed');
                  setIsLoading(false);
                  if (pollInterval) clearInterval(pollInterval);
                }
              }
            }, 3000);
          }
        } else {
          // No episode exists - create one and generate script + audio
          const { episodeId, status } = await createPodcastEpisode(lessonId);
          
          let newEpisode = await fetchPodcastEpisode(lessonId);
          if (newEpisode) {
            setEpisode(newEpisode);
          }

          // Generate script (this updates status to 'scripting' then 'voicing')
          try {
            await generatePodcastScript(episodeId);
            newEpisode = await fetchPodcastEpisode(lessonId);
            if (newEpisode) {
              setEpisode(newEpisode);
            }

            // Generate audio (this updates status to 'ready' when done)
            // This happens in the background - we'll poll for completion
            generatePodcastAudio(episodeId).catch(err => {
              console.error('Audio generation failed:', err);
            });
          } catch (error: any) {
            console.error('Script generation failed:', error);
            setLoadError(error.message || 'Failed to generate podcast');
            setIsLoading(false);
            return;
          }

          // Start polling for updates
          pollInterval = setInterval(async () => {
            const updated = await fetchPodcastEpisode(lessonId);
            if (updated) {
              setEpisode(updated);
              
              if (updated.status === 'ready') {
                const episodeSegments = await fetchPodcastSegments(updated.id);
                setSegments(episodeSegments);

                const totalDuration = episodeSegments.reduce(
                  (sum, seg) => sum + (seg.durationMs || 0),
                  0
                ) / 1000;
                setDuration(Math.floor(totalDuration));

                const durations = episodeSegments.map(seg => (seg.durationMs || 0) / 1000);
                setSegmentDurations(durations);

                // Generate audio URLs
                const urls = episodeSegments.map(seg => {
                  if (seg.audioPath) {
                    const { data } = supabase.storage
                      .from('tts_audio')
                      .getPublicUrl(seg.audioPath);
                    return data.publicUrl;
                  }
                  return '';
                }).filter(url => url !== '');
                setAudioUrls(urls);

                setIsLoading(false);
                if (pollInterval) clearInterval(pollInterval);
              } else if (updated.status === 'failed') {
                setLoadError(updated.error || 'Podcast generation failed');
                setIsLoading(false);
                if (pollInterval) clearInterval(pollInterval);
              }
            }
          }, 3000);
        }
      } catch (error: any) {
        console.error('Failed to load podcast:', error);
        setLoadError(error.message || 'Failed to load podcast');
        setIsLoading(false);
      }
    };

    loadPodcast();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [lessonId]);

  // Set audio mode once on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Auto-scroll transcript to current segment
  useEffect(() => {
    if (segments.length > 0 && currentSegmentIndex < segments.length) {
      const segmentView = segmentRefs.current.get(currentSegmentIndex);
      if (segmentView && transcriptScrollRef.current) {
        segmentView.measureLayout(
          transcriptScrollRef.current as any,
          (x, y) => {
            transcriptScrollRef.current?.scrollTo({
              y: Math.max(0, y - 100), // Scroll with 100px offset from top
              animated: true,
            });
          },
          () => {
            // Fallback if measure fails
            console.log('Failed to measure segment position');
          }
        );
      }
    }
  }, [currentSegmentIndex, segments.length]);

  // TODO: For truly gapless playback, concatenate MP3 segments on backend
  // after generation completes. This would eliminate all gaps between segments.
  // Implementation: Add ffmpeg to Edge Function or use a service worker to
  // concatenate all segment files into one and store as episode.audio_path

  // Load audio when URLs are available
  useEffect(() => {
    console.log(`🎧 Audio load useEffect triggered: urls=${audioUrls.length}, index=${currentSegmentIndex}`);
    
    const loadAudio = async () => {
      if (audioUrls.length > 0 && currentSegmentIndex < audioUrls.length) {
        // Skip segments without audio URLs
        if (!audioUrls[currentSegmentIndex]) {
          console.log(`⏭️  Skipping segment ${currentSegmentIndex + 1} (no audio)`);
          if (currentSegmentIndex < audioUrls.length - 1) {
            setCurrentSegmentIndex(prev => prev + 1);
          }
          return;
        }
        
        console.log(`🎵 Loading audio for segment ${currentSegmentIndex + 1}/${audioUrls.length}`);
        
        try {
          const startTime = Date.now();
          
          // Check if we have a preloaded sound ready
          if (nextSound) {
            console.log(`⚡ Using preloaded segment ${currentSegmentIndex + 1}`);
            
            // Unload old sound
            if (sound) {
              await sound.unloadAsync();
            }
            
            // Use the preloaded sound
            setSound(nextSound);
            setNextSound(null);
            console.log(`✅ Sound state set from preload (segment ${currentSegmentIndex + 1})`);
            
            // Update playback status
            if (isPlaying) {
              await nextSound.playAsync();
            }
            
            await nextSound.setRateAsync(playbackRate, true, Audio.PitchCorrectionQuality.High);
            await nextSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          } else {
            // No preload available - load normally
            if (sound) {
              await sound.unloadAsync();
            }
            
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: audioUrls[currentSegmentIndex] },
              { 
                shouldPlay: isPlaying, 
                rate: playbackRate,
                pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
              },
              onPlaybackStatusUpdate
            );
            
            const loadTime = Date.now() - startTime;
            setSound(newSound);
            console.log(`✅ Sound state set (segment ${currentSegmentIndex + 1}/${audioUrls.length} in ${loadTime}ms)`);
            console.log(`   Sound object:`, newSound ? 'created' : 'null');
          }
          
          // Preload next segment in background (for gapless playback)
          // Find next segment with audio
          let nextIndex = currentSegmentIndex + 1;
          while (nextIndex < audioUrls.length && !audioUrls[nextIndex]) {
            nextIndex++;
          }
          
          if (nextIndex < audioUrls.length) {
            console.log(`🔄 Preloading segment ${nextIndex + 1}...`);
            
            try {
              const { sound: preloadedSound } = await Audio.Sound.createAsync(
                { uri: audioUrls[nextIndex] },
                { 
                  shouldPlay: false,
                  rate: playbackRate,
                  pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
                }
              );
              setNextSound(preloadedSound);
              console.log(`✅ Preloaded segment ${nextIndex + 1}`);
            } catch (preloadError) {
              console.warn('Failed to preload next segment:', preloadError);
            }
          }
        } catch (error) {
          console.error('Error loading audio:', error);
        }
      }
    };

    loadAudio();
    
    // Cleanup
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (nextSound) {
        nextSound.unloadAsync();
      }
    };
  }, [audioUrls, currentSegmentIndex]);

  // Playback status update callback (memoized to prevent re-renders)
  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded && !isSeeking) {
      // Calculate cumulative time: sum of all previous segments + current position
      const previousSegmentsDuration = segmentDurations
        .slice(0, currentSegmentIndex)
        .reduce((sum, dur) => sum + dur, 0);
      
      const currentSegmentTime = status.positionMillis / 1000;
      const totalTime = previousSegmentsDuration + currentSegmentTime;
      
      // Throttle UI updates to reduce re-renders (only update every 500ms)
      const now = Date.now();
      if (now - lastTimeUpdateRef.current >= UPDATE_INTERVAL_MS) {
        setCurrentTime(Math.floor(totalTime));
        lastTimeUpdateRef.current = now;
      }
      
      if (status.didJustFinish && !status.isLooping) {
        console.log(`🎵 Segment ${currentSegmentIndex + 1} finished`);
        
        // IMPORTANT: Stop current sound before moving to next
        if (sound) {
          sound.stopAsync().catch(err => console.log('Stop error:', err));
        }
        
        // Find next segment with audio
        let nextIndex = currentSegmentIndex + 1;
        while (nextIndex < audioUrls.length && !audioUrls[nextIndex]) {
          console.log(`⏭️  Skipping segment ${nextIndex + 1} (no audio)`);
          nextIndex++;
        }
        
        if (nextIndex < audioUrls.length) {
          console.log(`➡️  Moving to segment ${nextIndex + 1}/${audioUrls.length}`);
          setCurrentSegmentIndex(nextIndex);
          // isPlaying state will remain true, so next segment auto-plays
        } else {
          console.log('✅ Podcast finished');
          setIsPlaying(false);
          setCurrentTime(0);
          setCurrentSegmentIndex(0);
        }
      }
    }
  }, [segmentDurations, currentSegmentIndex, audioUrls.length, isSeeking]);

  const progress = duration > 0 ? currentTime / duration : 0;

  // Helper function to get status message
  const getStatusMessage = (): string => {
    if (!episode) return 'Loading...';
    
    switch (episode.status) {
      case 'queued':
        return 'Podcast queued for generation...';
      case 'scripting':
        return 'Writing podcast dialogue...';
      case 'voicing':
        return `Generating audio (${segments.length}/${episode.totalSegments} segments)...`;
      case 'ready':
        return 'Podcast ready!';
      case 'failed':
        return 'Generation failed';
      default:
        return 'Processing...';
    }
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
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lessonTitle}
          </Text>
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownload}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Loading/Error State */}
        {(isLoading || loadError || episode?.status !== 'ready') && (
          <View style={styles.statusContainer}>
            {loadError ? (
              <>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.statusTitle}>Generation Failed</Text>
                <Text style={styles.statusMessage}>{loadError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setLoadError(null);
                    setIsLoading(true);
                    // Trigger reload
                    navigation.replace('PodcastPlayer', { lessonId, lessonTitle });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.statusTitle}>{getStatusMessage()}</Text>
                <Text style={styles.statusSubtext}>
                  {episode?.status === 'voicing'
                    ? 'This may take a few minutes'
                    : 'Please wait...'}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Transcript Area - Only show when ready */}
        {episode?.status === 'ready' && !loadError && segments.length > 0 && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>Transcript</Text>
          <ScrollView 
            ref={transcriptScrollRef}
            style={styles.transcriptScroll}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
          >
            {segments.map((segment, index) => (
              <View
                key={segment.id}
                ref={(ref) => {
                  if (ref) {
                    segmentRefs.current.set(index, ref);
                  }
                }}
                style={[
                  styles.transcriptSegment,
                  index === currentSegmentIndex && styles.transcriptSegmentActive
                ]}
              >
                <View style={styles.transcriptSegmentHeader}>
                  <Text style={styles.transcriptSpeaker}>
                    {segment.speaker === 'a' ? 'Host' : 'Co-host'}
                  </Text>
                  {index === currentSegmentIndex && (
                    <Ionicons name="play-circle" size={14} color={colors.primary} />
                  )}
                </View>
                <Text style={[
                  styles.transcriptText,
                  index === currentSegmentIndex && styles.transcriptTextActive
                ]}>
                  {segment.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
        )}

        {/* Join in Mic Button - Only show when ready */}
        {episode?.status === 'ready' && !loadError && (
        <View style={styles.joinMicContainer}>
          <TouchableOpacity
            style={[
              styles.joinMicButton,
              isInLiveSession && styles.joinMicButtonActive,
            ]}
            onPress={handleJoinMic}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isInLiveSession ? 'mic' : 'mic-outline'}
              size={20}
              color={isInLiveSession ? colors.background : colors.textPrimary}
            />
            <Text
              style={[
                styles.joinMicText,
                isInLiveSession && styles.joinMicTextActive,
              ]}
            >
              {isInLiveSession ? 'Live - Tap to leave' : 'Join in & ask questions'}
            </Text>
          </TouchableOpacity>
        </View>
        )}

        {/* Engagement Row - Only show when ready */}
        {episode?.status === 'ready' && !loadError && (
        <View style={styles.engagementRow}>
          <TouchableOpacity
            onPress={cyclePlaybackRate}
            activeOpacity={0.7}
          >
            <Text style={styles.rateText}>{playbackRate}x</Text>
          </TouchableOpacity>

          <View style={styles.likesContainer}>
            <TouchableOpacity
              style={[styles.iconButton, isLiked === true && styles.iconButtonActive]}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked === true ? 'thumbs-up' : 'thumbs-up-outline'}
                size={16}
                color={isLiked === true ? colors.primary : colors.textPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, isLiked === false && styles.iconButtonActive]}
              onPress={handleDislike}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked === false ? 'thumbs-down' : 'thumbs-down-outline'}
                size={16}
                color={isLiked === false ? colors.primary : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Progress Bar - Only show when ready */}
        {episode?.status === 'ready' && !loadError && (
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          
          <View
            style={styles.sliderContainer}
            onLayout={(event) => {
              setSliderWidth(event.nativeEvent.layout.width);
            }}
            {...sliderPanResponder.panHandlers}
          >
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFilled, { width: `${progress * 100}%` }]} />
            </View>
            <View 
              style={[
                styles.sliderThumb,
                { left: `${progress * 100}%` }
              ]} 
            />
          </View>
          
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        )}

        {/* Playback Controls - Only show when ready */}
        {episode?.status === 'ready' && !loadError && (
        <View style={styles.controls}>
          {/* Skip Backward Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipBackward}
            activeOpacity={0.6}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={26}
              color="rgba(255, 255, 255, 0.95)"
            />
          </TouchableOpacity>

          {/* Play/Pause Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}
              activeOpacity={0.9}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={40}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Skip Forward Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipForward}
            activeOpacity={0.6}
          >
            <Ionicons
              name="arrow-redo-outline"
              size={26}
              color="rgba(255, 255, 255, 0.95)"
            />
          </TouchableOpacity>
        </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </View>

      {/* Join-In Modal */}
      <Modal
        visible={showJoinInModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseJoinInModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎤 Join the Conversation</Text>
              <TouchableOpacity
                onPress={handleCloseJoinInModal}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {isListening 
                ? "🎙️ Listening... Speak your question now" 
                : joinInInput 
                  ? "Tap 'Send' to submit, or 'Start' to add more" 
                  : "Tap 'Start' to begin voice input"}
            </Text>

            {/* Listening Status */}
            {isListening && (
              <View style={styles.listeningIndicator}>
                <Animated.View 
                  style={[
                    styles.listeningPulse,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  <Ionicons name="mic" size={32} color={colors.primary} />
                </Animated.View>
                <Text style={styles.listeningText}>Listening...</Text>
              </View>
            )}

            {/* Transcript Display */}
            <View style={styles.transcriptBox}>
              <ScrollView 
                ref={joinInTranscriptScrollRef}
                style={styles.transcriptScroll}
              >
                {joinInInput && (
                  <Text style={styles.finalTranscriptText}>{joinInInput}</Text>
                )}
                {partialTranscript && (
                  <Text style={styles.partialTranscriptText}> {partialTranscript}</Text>
                )}
                {!joinInInput && !partialTranscript && (
                  <Text style={styles.placeholderText}>
                    Your transcript will appear here...
                  </Text>
                )}
              </ScrollView>
            </View>

            <Text style={styles.modalCharCount}>
              {joinInInput.length}/500
            </Text>

            {/* Control Buttons */}
            <View style={styles.modalButtonRow}>
              {/* Mic Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isListening && styles.micButtonActive
                ]}
                onPress={toggleListening}
                disabled={isJoinInLoading}
              >
                <Ionicons 
                  name={isListening ? "mic" : "mic-outline"} 
                  size={24} 
                  color={isListening ? colors.background : colors.primary} 
                />
                <Text style={[
                  styles.micButtonText,
                  isListening && styles.micButtonTextActive
                ]}>
                  {isListening ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>

              {/* Send Button */}
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  (!joinInInput.trim() || isJoinInLoading || isListening) && styles.modalSubmitButtonDisabled
                ]}
                onPress={handleJoinInSubmit}
                disabled={!joinInInput.trim() || isJoinInLoading || isListening}
              >
                {isJoinInLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={colors.background} />
                    <Text style={styles.modalSubmitText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join-In Playing Indicator */}
      {isPlayingJoinIn && (
        <View style={styles.joinInPlayingOverlay}>
          <View style={styles.joinInPlayingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.joinInPlayingText}>
              Hosts are responding...
            </Text>
          </View>
        </View>
      )}
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  downloadButton: {
    padding: spacing.sm,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  statusMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  transcriptContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    paddingBottom: spacing.md,
  },
  transcriptSegment: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  transcriptSegmentActive: {
    backgroundColor: 'rgba(77, 119, 255, 0.08)',
    borderLeftColor: colors.primary,
  },
  transcriptSegmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  transcriptSpeaker: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  transcriptTextActive: {
    color: colors.textPrimary,
  },
  joinMicContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  joinMicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  joinMicButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  joinMicText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  joinMicTextActive: {
    color: colors.background,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  rateText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconButton: {
    padding: spacing.sm,
  },
  iconButtonActive: {
    // Active state handled by icon color
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    minWidth: 45,
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFilled: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    top: '50%',
    marginTop: -8,
    marginLeft: -8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  skipText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    bottom: 14,
    opacity: 0.9,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  // Join-In Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
    textAlign: 'center',
  },
  listeningIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  listeningPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  transcriptBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 120,
    maxHeight: 200,
  },
  transcriptScroll: {
    flex: 1,
  },
  finalTranscriptText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  partialTranscriptText: {
    fontSize: 16,
    color: colors.textTertiary,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  modalCharCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    flex: 1,
  },
  micButtonActive: {
    backgroundColor: colors.primary,
  },
  micButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  micButtonTextActive: {
    color: colors.background,
  },
  modalSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    flex: 1,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  joinInPlayingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinInPlayingCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
    minWidth: 200,
  },
  joinInPlayingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
