import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../ui/tokens';
import { ActionTile } from '../../components/ActionTile/ActionTile';
import { NotesPreview } from '../../components/NotesPreview/NotesPreview';
import { BottomSheet, BottomSheetAction } from '../../components/BottomSheet/BottomSheet';
import { RenameLessonModal } from '../../components/RenameLessonModal/RenameLessonModal';
import { InteractiveQuestionsModal } from '../../components/InteractiveQuestionsModal/InteractiveQuestionsModal';
import { ScheduleBottomSheet } from '../../components/ScheduleBottomSheet/ScheduleBottomSheet';
import { updateLessonTitle, deleteLesson } from '../../data/lessons.repository';
import { supabase, SUPABASE_URL } from '../../config/supabase';
import { generateYouTubeRecommendations, fetchYouTubeResources } from '../../data/youtube.repository';
import { upsertStudyPlan, buildRRule } from '../../data/schedule.repository';
import { preloadPodcast } from '../../data/podcasts.repository';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const ACTION_CARD_SIZE = (WINDOW_WIDTH - spacing.lg * 2 - spacing.md) / 2;

interface LessonHubScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
    };
  };
  navigation: any;
}

// Mock lesson data structure
interface LessonData {
  notesContent?: string;
  outputs: {
    flashcards: boolean;
    quiz: boolean;
    podcast: boolean;
    video: boolean;
    interactive_pages: boolean;
  };
  processing: Set<string>;
}

export const LessonHubScreen: React.FC<LessonHubScreenProps> = ({ route, navigation }) => {
  const { lessonId, lessonTitle } = route.params;
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(lessonTitle);
  const [youtubeSheetVisible, setYoutubeSheetVisible] = useState(false);
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [interactiveQuestionsModalVisible, setInteractiveQuestionsModalVisible] = useState(false);

  // Mock lesson data - replace with actual data fetching
  const [lessonData, setLessonData] = useState<LessonData>({
    notesContent: '', // Empty for now - will be populated from DB
    outputs: {
      flashcards: false,
      quiz: false,
      podcast: false,
      video: false,
      interactive_pages: false,
    },
    processing: new Set(),
  });

  // Fetch YouTube resources
  useEffect(() => {
    loadYouTubeResources();
  }, [lessonId]);

  const loadYouTubeResources = async () => {
    try {
      const videos = await fetchYouTubeResources(lessonId);
      setYoutubeVideos(videos);
    } catch (error: any) {
      // Silently handle errors - don't log anything
      // Just set empty array so UI doesn't break
      setYoutubeVideos([]);
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      setGeneratingVideos(true);
      setYoutubeSheetVisible(false);
      
      const { videos } = await generateYouTubeRecommendations(lessonId);
      setYoutubeVideos(videos);
      
      // Reopen sheet to show new videos
      setTimeout(() => {
        setYoutubeSheetVisible(true);
      }, 300);
      
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      alert(error.message || 'Failed to generate recommendations');
    } finally {
      setGeneratingVideos(false);
    }
  };

  // Load notes and outputs on mount and when screen comes into focus
  useEffect(() => {
    loadLessonData();
    loadCourseId();

    // Reload when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[LessonHub] Screen focused, reloading data');
      loadLessonData();
    });

    return unsubscribe;
  }, [lessonId, navigation]);

  // Subscribe to real-time updates for lesson outputs and assets
  useEffect(() => {
    console.log('[LessonHub] Setting up real-time subscriptions');

    // Subscribe to lesson_outputs changes
    const outputsChannel = supabase
      .channel(`lesson_outputs_${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_outputs',
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          console.log('[LessonHub] Lesson output changed:', payload);
          loadLessonData(); // Reload data when outputs change
        }
      )
      .subscribe();

    // Subscribe to lesson_assets changes
    const assetsChannel = supabase
      .channel(`lesson_assets_${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_assets',
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          console.log('[LessonHub] Lesson asset changed:', payload);
          loadLessonData(); // Reload data when assets change
        }
      )
      .subscribe();

    return () => {
      console.log('[LessonHub] Cleaning up real-time subscriptions');
      outputsChannel.unsubscribe();
      assetsChannel.unsubscribe();
    };
  }, [lessonId]);

  // Poll for updates while Interact is generating (Realtime may not be enabled for lesson_outputs)
  useEffect(() => {
    if (!lessonData.processing.has('interactive_pages')) return;
    const interval = setInterval(() => {
      loadLessonData();
    }, 12000);
    return () => clearInterval(interval);
  }, [lessonId, lessonData.processing.has('interactive_pages')]);

  const loadLessonData = async () => {
    try {
      // Fetch notes from lesson_outputs
      const { data: notesData, error: notesError } = await supabase
        .from('lesson_outputs')
        .select('notes_final_text, notes_raw_text, status')
        .eq('lesson_id', lessonId)
        .eq('type', 'notes')
        .single();

      if (!notesError && notesData) {
        // Use final text if available, otherwise raw text
        const notesContent = notesData.notes_final_text || notesData.notes_raw_text || '';
        console.log(`[LessonHub] Loaded notes: ${notesContent.length} chars`);
        setLessonData(prev => ({
          ...prev,
          notesContent,
        }));
      } else if (notesError && notesError.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's okay
        console.error('[LessonHub] Error loading notes:', notesError);
      }

      // Fetch all lesson outputs
      const { data: outputs, error: outputsError } = await supabase
        .from('lesson_outputs')
        .select('type, status')
        .eq('lesson_id', lessonId);

      // Fetch all lesson assets
      const { data: assets, error: assetsError } = await supabase
        .from('lesson_assets')
        .select('kind')
        .eq('lesson_id', lessonId);

      if (!outputsError && outputs) {
        const outputsMap = outputs.reduce((acc: any, output: any) => {
          const current = acc[output.type];
          if (current === 'ready') return acc;
          acc[output.type] = output.status;
          return acc;
        }, {});

        const processing = new Set<string>();
        
        // Check for processing states
        if (outputsMap.flashcards === 'processing') processing.add('flashcards');
        if (outputsMap.quiz === 'processing') processing.add('quiz');
        if (outputsMap.interactive_pages === 'processing' || outputsMap.interactive_pages === 'queued') processing.add('interactive_pages');

        // Check assets for podcast and video; lesson_outputs for interactive_pages
        const hasPodcast = assets?.some((a: any) => a.kind === 'audio') || false;
        const hasVideo = assets?.some((a: any) => a.kind === 'video') || false;
        const hasInteractivePages = outputsMap.interactive_pages === 'ready';

        setLessonData(prev => ({
          ...prev,
          outputs: {
            flashcards: outputsMap.flashcards === 'ready',
            quiz: outputsMap.quiz === 'ready',
            podcast: hasPodcast,
            video: hasVideo,
            interactive_pages: hasInteractivePages,
          },
          processing,
        }));

        console.log('[LessonHub] Loaded outputs:', {
          flashcards: outputsMap.flashcards,
          quiz: outputsMap.quiz,
          podcast: hasPodcast,
          video: hasVideo,
          interactive_pages: hasInteractivePages,
        });
      }
      
    } catch (err: any) {
      console.error('[LessonHub] Failed to load lesson data:', err);
    }
  };

  const loadCourseId = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('course_id')
        .eq('id', lessonId)
        .single();

      if (!error && data) {
        setCourseId(data.course_id);
      }
    } catch (err: any) {
      console.error('[LessonHub] Failed to load course ID:', err);
    }
  };

  // Handle rename lesson
  const handleRenameLesson = async (newTitle: string) => {
    try {
      await updateLessonTitle(lessonId, newTitle);
      setCurrentTitle(newTitle);
      // Update navigation params so the title stays updated
      navigation.setParams({ lessonTitle: newTitle });
    } catch (error: any) {
      console.error('Failed to rename lesson:', error.message);
      throw error;
    }
  };

  const handleResetInteractiveGeneration = async () => {
    setMenuVisible(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please sign in again.');
      }
      const response = await fetch(
        `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/lesson_generate_interactive_reset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ lesson_id: lessonId }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to reset');
      }
      await loadLessonData();
    } catch (error: any) {
      console.error('Reset interactive generation:', error);
      alert(error.message || 'Failed to reset Interact generation');
    }
  };

  const isInteractGenerating = lessonData.processing.has('interactive_pages');

  // Overflow menu actions
  const menuActions: BottomSheetAction[] = [
    ...(isInteractGenerating
      ? [{
          label: 'Cancel Interact generation',
          onPress: handleResetInteractiveGeneration,
        }]
      : []),
    {
      label: 'Rename Lesson',
      onPress: () => {
        setMenuVisible(false);
        setRenameModalVisible(true);
      },
    },
    {
      label: 'Mark Complete',
      onPress: () => {
        setMenuVisible(false);
        console.log('Mark complete');
      },
    },
    {
      label: 'Delete Lesson',
      onPress: () => {
        setMenuVisible(false);
        Alert.alert(
          'Delete Lesson',
          `Delete "${currentTitle}"? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteLesson(lessonId);
                  navigation.goBack();
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to delete lesson');
                }
              },
            },
          ]
        );
      },
    },
  ];

  // Action handlers
  const handleLiveTranscription = () => {
    // Navigate to Lesson Workspace (includes translation + listen)
    navigation.navigate('LessonWorkspace', {
      lessonId,
      lessonTitle,
    });
  };

  const handleAITutor = async () => {
    // Calculate source count (notes + transcript + summary)
    let sourceCount = 0;
    
    try {
      // Check for notes
      const { data: notes } = await supabase
        .from('lesson_outputs')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('type', 'notes')
        .eq('status', 'ready')
        .single();
      if (notes) sourceCount++;

      // Check for transcript
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('lesson_id', lessonId)
        .limit(1)
        .single();
      if (sessions) sourceCount++;

      // Check for summary
      const { data: summary } = await supabase
        .from('lesson_outputs')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('type', 'summary')
        .eq('status', 'ready')
        .single();
      if (summary) sourceCount++;
    } catch (err) {
      console.log('[LessonHub] Error calculating source count:', err);
    }

    navigation.navigate('AITutor', {
      lessonId,
      lessonTitle,
      sourceCount,
    });
  };

  const handleFlashcards = () => {
    navigation.navigate('Flashcards', {
      lessonId,
      lessonTitle,
    });
  };

  const handleQuiz = () => {
    // Navigate to quiz screen
    navigation.navigate('Quiz', {
      lessonId,
      lessonTitle,
    });
  };

  const handlePodcast = () => {
    // Pre-load podcast data in background before navigation
    preloadPodcast(lessonId); // Fire and forget - loads in background
    
    // Navigate immediately (screen will use cached data if available)
    navigation.navigate('PodcastPlayer', {
      lessonId,
      lessonTitle,
      podcastAvailable: lessonData.outputs.podcast,
      // podcastUrl will be fetched from backend
    });
  };

  const handleAssets = () => {
    navigation.navigate('Assets', {
      lessonId,
      lessonTitle,
    });
  };

  const handlePlayVideo = async () => {
    try {
      console.log('[LessonHub] Fetching latest video for lesson:', lessonId);
      
      // Fetch the most recent video for this lesson
      const { data: videos, error: videoError } = await supabase
        .from('lesson_assets')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('kind', 'video')
        .not('storage_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (videoError) throw videoError;
      
      if (!videos || videos.length === 0) {
        console.log('[LessonHub] No videos found');
        alert('No video available yet');
        return;
      }

      const video = videos[0];
      console.log('[LessonHub] Playing video:', video.storage_path);

      // Get signed URL for the video
      const { data: urlData, error: urlError } = await supabase.storage
        .from('lesson-assets')
        .createSignedUrl(video.storage_path, 3600); // 1 hour expiry

      if (urlError) throw urlError;
      if (!urlData?.signedUrl) throw new Error('Failed to get video URL');

      console.log('[LessonHub] Navigating to video player');
      
      // Navigate to in-app video player
      navigation.navigate('VideoPlayer', {
        videoUrl: urlData.signedUrl,
        lessonTitle: lessonTitle,
      });
      
    } catch (error: any) {
      console.error('[LessonHub] Error playing video:', error);
      alert(error.message || 'Failed to play video');
    }
  };

  const handleGenerateVideo = async () => {
    try {
      // Set generating state immediately
      setLessonData(prev => ({
        ...prev,
        processing: new Set(prev.processing).add('video'),
      }));

      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      // Call video generation edge function
      const response = await fetch(
        `https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            aspect_ratios: ['16:9'],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to generate video');
      }

      const result = await response.json();
      console.log('[LessonHub] Video generation started:', result.video_id);
      
      // Don't remove from processing - let Realtime subscription handle it
      // when the video is actually ready
      
    } catch (error: any) {
      console.error('Error generating video:', error);
      alert(error.message || 'Failed to generate video. Please try again.');
      
      // Remove from processing on error
      setLessonData(prev => {
        const newProcessing = new Set(prev.processing);
        newProcessing.delete('video');
        return {
          ...prev,
          processing: newProcessing,
        };
      });
    }
  };

  const handleOpenNotes = () => {
    navigation.navigate('NotesView', {
      lessonId,
      lessonTitle: currentTitle,
    });
  };

  const handleInteractiveSolver = () => {
    navigation.navigate('InteractiveSolver', {
      lessonId,
      lessonTitle: currentTitle,
    });
  };

  const handleGenerateInteractivePages = async (options?: { imageBase64?: string; imageMimeType?: string }) => {
    try {
      setLessonData(prev => ({
        ...prev,
        processing: new Set(prev.processing).add('interactive_pages'),
      }));

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const baseUrl = SUPABASE_URL.replace(/\/$/, '');
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      let problem_texts: string[] | undefined;
      if (options?.imageBase64) {
        const extractRes = await fetch(
          `${baseUrl}/functions/v1/interactive_extract_questions_from_image`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              image_base64: options.imageBase64,
              image_mime_type: options.imageMimeType || 'image/jpeg',
            }),
          }
        );
        if (!extractRes.ok) {
          const errText = await extractRes.text();
          let err: { message?: string; error?: string } = {};
          try {
            err = errText ? JSON.parse(errText) : {};
          } catch {
            err = { error: errText || 'Could not read questions from the image. Try a clearer photo.' };
          }
          throw new Error(err.message || err.error || 'Could not read questions from the image. Try a clearer photo.');
        }
        const extractData = await extractRes.json();
        problem_texts = extractData.problem_texts;
        if (!Array.isArray(problem_texts) || problem_texts.length === 0) {
          throw new Error('No questions found in the image. Try a clearer photo.');
        }
      }

      const body: { lesson_id: string; problem_texts?: string[] } = { lesson_id: lessonId };
      if (problem_texts?.length) body.problem_texts = problem_texts;

      const response = await fetch(
        `${baseUrl}/functions/v1/lesson_generate_interactive`,
        { method: 'POST', headers, body: JSON.stringify(body) }
      );

      if (!response.ok) {
        const errText = await response.text();
        let err: { message?: string; error?: string } = {};
        try {
          err = errText ? JSON.parse(errText) : {};
        } catch {
          err = { error: errText || 'Failed to start interactive generation' };
        }
        throw new Error(err.message || err.error || 'Failed to start interactive generation');
      }

      const result = await response.json();
      console.log('[LessonHub] Interactive generation started:', result.job_id);
    } catch (error: any) {
      console.error('Error generating interactive module:', error);
      alert(error.message || 'Failed to generate interactive module. Please try again.');
      setLessonData(prev => {
        const next = new Set(prev.processing);
        next.delete('interactive_pages');
        return { ...prev, processing: next };
      });
    }
  };

  // Helper to get badge state for generatable content
  const getBadgeState = (contentType: 'flashcards' | 'quiz' | 'podcast' | 'video' | 'interactive_pages'): 'Generate' | 'Generating' | 'Generated' | undefined => {
    if (lessonData.processing.has(contentType)) {
      return 'Generating';
    }
    if (lessonData.outputs[contentType]) {
      return 'Generated';
    }
    return 'Generate';
  };

  const handleCreateSchedule = async (schedule: {
    title: string;
    days: number[];
    time: Date;
    duration: number;
    reminder: number;
  }) => {
    try {
      setCreatingSchedule(true);
      
      // Format time as HH:MM:SS
      const hours = schedule.time.getHours().toString().padStart(2, '0');
      const minutes = schedule.time.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;

      // Create RRULE from selected days
      const rrule = buildRRule(schedule.days);

      await upsertStudyPlan({
        title: schedule.title,
        courseId: courseId,
        rules: [
          {
            rrule,
            startTimeLocal: timeString,
            durationMin: schedule.duration,
            remindBeforeMin: schedule.reminder,
          },
        ],
      });

      setScheduleSheetVisible(false);
      
      // Show success message with option to view all schedules
      alert('Study schedule created successfully!');
      
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      alert(error.message || 'Failed to create schedule');
    } finally {
      setCreatingSchedule(false);
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
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.title} numberOfLines={1}>
            {currentTitle}
          </Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setYoutubeSheetVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="play-circle-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setScheduleSheetVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Notes Preview - PRIMARY */}
          <NotesPreview
            content={lessonData.notesContent}
            onOpenFull={handleOpenNotes}
          />

          {/* Section Label */}
          <Text style={styles.sectionLabel}>Actions</Text>

          {/* Action pyramid: Live|AI Tutor | Interact|Podcast|Video | Flashcards|Quiz | Assets */}
          <View style={styles.pyramid}>
            <View style={styles.pyramidRow}>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="radio-outline"
                  label="Live"
                  subtitle="Record + translate"
                  onPress={handleLiveTranscription}
                />
              </View>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="chatbubbles-outline"
                  label="AI Tutor"
                  onPress={handleAITutor}
                />
              </View>
            </View>
            <View style={styles.pyramidRow}>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="game-controller-outline"
                  label="Interact"
                  subtitle="Practice steps"
                  badge={getBadgeState('interactive_pages')}
                  disabled={lessonData.processing.has('interactive_pages')}
                  onPress={() => {
                    if (lessonData.outputs.interactive_pages) {
                      handleInteractiveSolver();
                    } else {
                      setInteractiveQuestionsModalVisible(true);
                    }
                  }}
                  onReset={isInteractGenerating ? handleResetInteractiveGeneration : undefined}
                />
              </View>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="mic-outline"
                  label="Podcast"
                  badge={getBadgeState('podcast')}
                  disabled={lessonData.processing.has('podcast')}
                  onPress={handlePodcast}
                />
              </View>
            </View>
            <View style={styles.pyramidRow}>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="videocam-outline"
                  label="Video"
                  subtitle="30s explainer"
                  badge={getBadgeState('video')}
                  disabled={lessonData.processing.has('video')}
                  onPress={() => {
                    if (lessonData.outputs.video) {
                      handlePlayVideo();
                    } else {
                      handleGenerateVideo();
                    }
                  }}
                />
              </View>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="layers-outline"
                  label="Flashcards"
                  badge={getBadgeState('flashcards')}
                  disabled={lessonData.processing.has('flashcards')}
                  onPress={handleFlashcards}
                />
              </View>
            </View>
            <View style={styles.pyramidRow}>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="help-circle-outline"
                  label="Quiz"
                  badge={getBadgeState('quiz')}
                  disabled={lessonData.processing.has('quiz')}
                  onPress={handleQuiz}
                />
              </View>
              <View style={styles.pyramidItem}>
                <ActionTile
                  icon="folder-outline"
                  label="Assets"
                  onPress={handleAssets}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Overflow Menu */}
        <BottomSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          actions={menuActions}
        />

        {/* YouTube Recommendations Bottom Sheet */}
        <BottomSheet
          visible={youtubeSheetVisible}
          onClose={() => setYoutubeSheetVisible(false)}
          title="YouTube Resources"
          actions={
            youtubeVideos.length > 0
              ? youtubeVideos.map((video) => ({
                  label: video.title,
                  subtitle: video.channel_name,
                  icon: 'logo-youtube' as any,
                  onPress: () => {
                    setYoutubeSheetVisible(false);
                    const youtubeUrl = `https://www.youtube.com/watch?v=${video.video_id}`;
                    // Open YouTube URL (will open in YouTube app if installed, otherwise browser)
                    Linking.openURL(youtubeUrl).catch((err) =>
                      console.error('Error opening YouTube:', err)
                    );
                  },
                }))
              : [
                  {
                    label: 'No videos yet',
                    subtitle: 'Generate recommendations or import a video',
                    icon: 'information-circle-outline' as any,
                    onPress: () => {},
                  },
                  {
                    label: generatingVideos ? 'Generating...' : 'Generate Recommendations',
                    icon: 'sparkles-outline' as any,
                    onPress: generatingVideos ? () => {} : handleGenerateRecommendations,
                  },
                ]
          }
        />

        {/* Rename Modal */}
        <RenameLessonModal
          visible={renameModalVisible}
          currentTitle={currentTitle}
          onClose={() => setRenameModalVisible(false)}
          onRename={handleRenameLesson}
        />

        {/* Interactive questions source modal */}
        <InteractiveQuestionsModal
          visible={interactiveQuestionsModalVisible}
          onClose={() => setInteractiveQuestionsModalVisible(false)}
          onUseAIGenerated={() => handleGenerateInteractivePages()}
          onUsePhoto={(imageBase64, mimeType) => handleGenerateInteractivePages({ imageBase64, imageMimeType: mimeType })}
        />

        {/* Schedule Bottom Sheet */}
        <ScheduleBottomSheet
          visible={scheduleSheetVisible}
          onClose={() => setScheduleSheetVisible(false)}
          onSave={handleCreateSchedule}
          defaultTitle={`Study ${currentTitle}`}
          loading={creatingSchedule}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridItem: {
    width: '50%',
    padding: spacing.xs,
  },
  pyramid: {
    alignItems: 'flex-start',
    gap: spacing.md,
    width: '100%',
  },
  pyramidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.sm,
  },
  pyramidItem: {
    width: ACTION_CARD_SIZE,
  },
});
