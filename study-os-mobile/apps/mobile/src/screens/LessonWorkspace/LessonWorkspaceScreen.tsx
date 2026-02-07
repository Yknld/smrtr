import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../ui/tokens';
import { supabase } from '../../config/supabase';
import { AssemblyLiveService, TranscriptEvent } from '../../services/assemblyLive';
import { notesService } from '../../services/notes';

/**
 * Animated waveform icon that pulses while recording
 */
const WaveformIcon = ({ isRecording }: { isRecording: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulsing animation: scale from 1 to 1.15 and back
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
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
    } else {
      // Reset animation
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <Path
          d="M9 4C9 2.34315 7.65685 1 6 1C4.34315 1 3 2.34315 3 4V12C3 13.6569 4.34315 15 6 15C7.65685 15 9 13.6569 9 12V4Z"
          fill={isRecording ? colors.textPrimary : colors.textTertiary}
        />
        <Path
          d="M15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8V16C9 17.6569 10.3431 19 12 19C13.6569 19 15 17.6569 15 16V8Z"
          fill={isRecording ? colors.textPrimary : colors.textTertiary}
        />
        <Path
          d="M21 4C21 2.34315 19.6569 1 18 1C16.3431 1 15 2.34315 15 4V12C15 13.6569 16.3431 15 18 15C19.6569 15 21 13.6569 21 12V4Z"
          fill={isRecording ? colors.textPrimary : colors.textTertiary}
        />
      </Svg>
    </Animated.View>
  );
};

interface LessonWorkspaceScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
    };
  };
  navigation: any;
}

export const LessonWorkspaceScreen: React.FC<LessonWorkspaceScreenProps> = ({
  route,
  navigation,
}) => {
  const { lessonId, lessonTitle } = route.params;
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);
  const [qaExpanded, setQaExpanded] = useState(false);
  const [listeningMode, setListeningMode] = useState(false);
  const [translateSheetVisible, setTranslateSheetVisible] = useState(false);
  const [askInput, setAskInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Live transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialText, setPartialText] = useState('');
  const [recordingStatus, setRecordingStatus] = useState<string>('Tap mic to record');
  const assemblyServiceRef = useRef<AssemblyLiveService | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesIsFinal, setNotesIsFinal] = useState(false);
  const [isFinalizingNotes, setIsFinalizingNotes] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('');

  // Q&A state
  const [qaHistory, setQaHistory] = useState<Array<{question: string; answer: string}>>([]);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');

  // Refs for intervals
  const notesGenerationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (assemblyServiceRef.current) {
        assemblyServiceRef.current.stop();
      }
      if (notesGenerationIntervalRef.current) {
        clearInterval(notesGenerationIntervalRef.current);
      }
    };
  }, []);

  const sourceCount = transcript ? 1 : 0;

  /**
   * Load notes for the lesson (only when not actively recording)
   */
  const loadNotes = async () => {
    try {
      const notesData = await notesService.getNotes(lessonId);
      
      // Only load if we don't have notes in memory (prevents overwriting live notes)
      if (!isRecording && notes.length === 0) {
        setNotes(notesData.text);
        setNotesIsFinal(notesData.isFinal);
        console.log(`[Notes] Loaded from DB: ${notesData.text.length} chars, final: ${notesData.isFinal}`);
      } else {
        console.log(`[Notes] Skipped loading (recording: ${isRecording}, has notes: ${notes.length > 0})`);
      }
    } catch (err) {
      console.error('[Notes] Failed to load notes:', err);
      // Don't show error to user - notes might not exist yet
    }
  };

  /**
   * Generate notes incrementally from new transcript (called every 20 seconds)
   * Using refs to avoid stale closure issues with timers
   */
  const transcriptRef = useRef(transcript);
  const lastProcessedTranscriptRef = useRef(lastProcessedTranscript);
  const isGeneratingNotesRef = useRef(isGeneratingNotes);

  // Keep refs in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    lastProcessedTranscriptRef.current = lastProcessedTranscript;
  }, [lastProcessedTranscript]);

  useEffect(() => {
    isGeneratingNotesRef.current = isGeneratingNotes;
  }, [isGeneratingNotes]);

  const generateNotesIncremental = async () => {
    const currentTranscript = transcriptRef.current;
    const currentLastProcessed = lastProcessedTranscriptRef.current;
    const currentlyGenerating = isGeneratingNotesRef.current;

    console.log('[Notes] 📝 generateNotesIncremental called', {
      isGenerating: currentlyGenerating,
      transcriptLength: currentTranscript.length,
      lastProcessedLength: currentLastProcessed.length,
      isRecording,
      hasNewContent: currentTranscript !== currentLastProcessed,
    });

    // Don't generate if no new content or already generating
    if (currentlyGenerating) {
      console.log('[Notes] ⏸️ Already generating, skipping');
      return;
    }

    if (currentTranscript === currentLastProcessed) {
      console.log('[Notes] ⏸️ No new transcript, skipping (identical strings)');
      console.log(`[Notes] Transcript: "${currentTranscript.substring(0, 50)}..."`);
      console.log(`[Notes] Last processed: "${currentLastProcessed.substring(0, 50)}..."`);
      return;
    }

    if (currentTranscript.length < 10) {
      console.log(`[Notes] ⏸️ Transcript too short (${currentTranscript.length} < 10), skipping`);
      return;
    }

    try {
      setIsGeneratingNotes(true);
      
      // For now, we'll use a simple approach: just append new content
      // In the future, we can call a Gemini API to summarize incrementally
      const newContent = currentTranscript.substring(currentLastProcessed.length);
      
      console.log(`[Notes] 📄 New content: "${newContent.substring(0, 100)}..." (${newContent.length} chars)`);
      
      if (newContent.trim().length > 0) {
        // Simple formatting: add new content as bullet points
        const formattedContent = `\n• ${newContent.trim().replace(/\. /g, '.\n• ')}`;
        
        setNotes(prev => {
          const updated = prev + formattedContent;
          console.log(`[Notes] ✅ Updated notes from ${prev.length} to ${updated.length} chars`);
          console.log(`[Notes] Preview: "${updated.substring(0, 100)}..."`);
          
          // Save to database asynchronously (don't await)
          saveNotesToDatabase(updated, false).catch(err => 
            console.error('[Notes] Background save failed:', err)
          );
          
          return updated;
        });
        
        setLastProcessedTranscript(currentTranscript);
        
        console.log(`[Notes] 🎉 Successfully generated notes from ${newContent.length} new chars`);
      } else {
        console.log(`[Notes] ⚠️ New content is empty after trim`);
      }

    } catch (err: any) {
      console.error('[Notes] ❌ Failed to generate notes:', err);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  /**
   * Save notes to database (called periodically and on finalize)
   */
  const saveNotesToDatabase = async (notesText: string, isFinal: boolean = false) => {
    try {
      console.log(`[Notes] 💾 Saving to database (${notesText.length} chars, final: ${isFinal})`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Notes] Not authenticated, cannot save');
        return;
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from('lesson_outputs')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .eq('type', 'notes')
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('lesson_outputs')
          .update({
            status: 'ready',
            notes_raw_text: isFinal ? '' : notesText,
            notes_final_text: isFinal ? notesText : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('[Notes] ❌ Failed to update database:', error);
        } else {
          console.log('[Notes] ✅ Updated existing record in database');
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('lesson_outputs')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            type: 'notes',
            status: 'ready',
            notes_raw_text: isFinal ? '' : notesText,
            notes_final_text: isFinal ? notesText : null,
            content_json: {},
          });

        if (error) {
          console.error('[Notes] ❌ Failed to insert to database:', error);
        } else {
          console.log('[Notes] ✅ Inserted new record to database');
        }
      }
    } catch (err: any) {
      console.error('[Notes] ❌ Error saving to database:', err);
    }
  };

  /**
   * Finalize notes using Gemini AI (auto-called when recording stops)
   */
  const finalizeNotes = async () => {
    try {
      setIsFinalizingNotes(true);

      const result = await notesService.finalizeNotes(lessonId);
      
      setNotes(result.notesText);
      setNotesIsFinal(true);

      console.log('[Notes] ✅ Finalized:', result.notesText.length, 'chars');

      // Save final notes to database
      await saveNotesToDatabase(result.notesText, true);

    } catch (err: any) {
      console.error('[Notes] ❌ Failed to finalize notes:', err);
      // Don't show alert - just log the error
    } finally {
      setIsFinalizingNotes(false);
    }
  };

  // Load notes when screen mounts (only if not recording)
  useEffect(() => {
    if (!isRecording) {
      loadNotes();
    }
  }, [lessonId]);

  // Trigger note generation when transcript changes (backup to timer)
  useEffect(() => {
    if (isRecording && transcript.length > 0 && transcript !== lastProcessedTranscript) {
      console.log(`[Notes] 🔄 Transcript changed! Length: ${transcript.length}, Last processed: ${lastProcessedTranscript.length}`);
      // Don't call immediately - let the timer handle it
      // This is just for logging to see if transcript is updating
    }
  }, [transcript, isRecording, lastProcessedTranscript]);

  /**
   * Handle transcript events from AssemblyAI
   */
  const handleTranscriptEvent = (event: TranscriptEvent) => {
    switch (event.type) {
      case 'connected':
        setRecordingStatus('Recording...');
        break;
      
      case 'partial':
        // Update partial text
        if (event.text) {
          setPartialText(event.text);
        }
        break;
      
      case 'final':
        // Append to final transcript and clear partial
        if (event.text) {
          console.log(`[Transcript] 🎤 Got final text: "${event.text}"`);
          setTranscript(prev => {
            const newTranscript = prev ? `${prev} ${event.text}` : event.text || '';
            console.log(`[Transcript] ✅ Updated from ${prev.length} to ${newTranscript.length} chars`);
            console.log(`[Transcript] Content preview: "${newTranscript.substring(0, 100)}..."`);
            return newTranscript;
          });
          setPartialText('');
        }
        break;
      
      case 'error':
        setRecordingStatus(`Error: ${event.error}`);
        Alert.alert('Transcription Error', event.error || 'Unknown error');
        break;
      
      case 'disconnected':
        setRecordingStatus('Disconnected');
        break;
    }
  };

  /**
   * Start live recording
   */
  const startRecording = async () => {
    try {
      setRecordingStatus('Starting...');
      setTranscript('');
      setPartialText('');
      setNotes(''); // Clear old notes
      setNotesIsFinal(false);
      setLastProcessedTranscript(''); // Reset tracking

      // Check auth before starting
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (!session || authError) {
        Alert.alert('Authentication Required', 'Please sign in first.');
        setRecordingStatus('Not authenticated');
        return;
      }

      // Create study session for this recording
      const { data: studySession, error: sessionError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: session.user.id,
          lesson_id: lessonId,
          mode: 'live_transcribe',
          status: 'active',
        })
        .select('id')
        .single();

      if (sessionError || !studySession) {
        console.error('Study session error:', sessionError);
        throw new Error(`Failed to create study session: ${sessionError?.message || 'Unknown error'}`);
      }

      sessionIdRef.current = studySession.id;
      console.log('Created study session:', studySession.id);

      // Create new AssemblyAI service instance
      assemblyServiceRef.current = new AssemblyLiveService(handleTranscriptEvent);

      // Start streaming transcription
      await assemblyServiceRef.current.start();
      
      // Start auto-committing notes every 5 seconds
      notesService.startAutoCommit(lessonId, studySession.id);
      
      // Do immediate first generation after 5 seconds
      const firstGenTimeout = setTimeout(() => {
        console.log('[Notes] ⏰ Timer: Running first generation after 5s');
        generateNotesIncremental();
      }, 5000);
      
      // Start incremental note generation every 20 seconds
      notesGenerationIntervalRef.current = setInterval(() => {
        console.log('[Notes] ⏰ Timer: Running periodic generation (20s interval)');
        generateNotesIncremental();
      }, 20000); // Every 20 seconds
      
      console.log('[Notes] ✅ Timers started: 5s initial + 20s periodic');
      
      setIsRecording(true);
      setRecordingStatus('Recording...');

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', error.message);
      setRecordingStatus('Error');
      setIsRecording(false);
    }
  };

  /**
   * Stop live recording
   */
  const stopRecording = async () => {
    try {
      setRecordingStatus('Stopping...');

      // Stop the AssemblyAI service
      const sessionId = await assemblyServiceRef.current?.stop();
      
      setIsRecording(false);

      // Stop auto-committing notes
      notesService.stopAutoCommit();

      // Stop incremental note generation
      if (notesGenerationIntervalRef.current) {
        clearInterval(notesGenerationIntervalRef.current);
        notesGenerationIntervalRef.current = null;
      }

      // Do one final incremental note generation
      await generateNotesIncremental();

      // Do final commit of notes
      if (sessionIdRef.current) {
        try {
          await notesService.commitNow(lessonId, sessionIdRef.current);
          console.log('Final notes commit complete');
        } catch (err) {
          console.error('Final notes commit failed:', err);
        }
      }

      setRecordingStatus('Complete');

      // Persist final transcript to Supabase
      if (sessionId && transcript) {
        await persistTranscript(sessionId, transcript);
      }

      // End the study session
      if (sessionIdRef.current) {
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionIdRef.current);
      }

      // DON'T load notes from DB - keep the ones we just generated
      // await loadNotes(); // REMOVED - this was clearing our notes!

      // Automatically finalize notes (no dialog)
      console.log('[Notes] Checking if should finalize. Notes length:', notes.length);
      if (notes.length > 0) {
        console.log('[Notes] Finalizing notes...');
        await finalizeNotes();
      } else {
        console.log('[Notes] No notes to finalize');
      }

    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', `Failed to stop: ${error.message}`);
      setRecordingStatus('Error');
    }
  };

  /**
   * Persist the final transcript to Supabase
   */
  const persistTranscript = async (sessionId: string, finalTranscript: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Not authenticated');
        return;
      }

      // Update the transcripts table with final text
      const { error: updateError } = await supabase
        .from('transcripts')
        .update({ 
          full_text: finalTranscript,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating transcript:', updateError);
        return;
      }

      // Mark session as complete
      const { error: sessionError } = await supabase
        .from('transcription_sessions')
        .update({ 
          status: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) {
        console.error('Error updating session status:', sessionError);
        return;
      }

      console.log('Transcript persisted successfully:', sessionId);
    } catch (error) {
      console.error('Error persisting transcript:', error);
    }
  };

  const handleAsk = async () => {
    if (!askInput.trim()) return;
    
    if (!transcript || transcript.length < 10) {
      Alert.alert('No Content', 'Please record some content first before asking questions.');
      return;
    }

    const question = askInput.trim();
    setCurrentQuestion(question);
    setAskInput('');
    setQaExpanded(true);
    setIsLoadingAnswer(true);

    try {
      // TODO: Call AI Q&A edge function
      // For now, show a coming soon message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAnswer = "AI Q&A will be available soon. I'll answer questions based on your transcript and lesson content.";
      
      setQaHistory(prev => [...prev, { question, answer: mockAnswer }]);
    } catch (error: any) {
      console.error('Q&A error:', error);
      Alert.alert('Error', 'Failed to get answer. Please try again.');
    } finally {
      setIsLoadingAnswer(false);
      setCurrentQuestion('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {lessonTitle}
            </Text>
            <Text style={styles.recordingStatus}>{recordingStatus}</Text>
          </View>

          <View style={styles.headerRight}>
            {/* Mic icon - start/stop live notes (large hit area for reliability) */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {isRecording ? (
                <WaveformIcon isRecording={true} />
              ) : (
                <Ionicons name="mic-outline" size={22} color={colors.textPrimary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setListeningMode(!listeningMode)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={listeningMode ? 'headset' : 'headset-outline'}
                size={20}
                color={listeningMode ? colors.primary : colors.textPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setTranslateSheetVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="language-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Q&A Window (appears when questions are asked) */}
          {(qaHistory.length > 0 || isLoadingAnswer) && (
            <View style={styles.qaBlock}>
              <TouchableOpacity
                style={styles.blockHeader}
                onPress={() => setQaExpanded(!qaExpanded)}
                activeOpacity={0.7}
              >
                <View style={styles.headerLabelContainer}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.primary} />
                  <Text style={styles.blockTitle}>Q&A</Text>
                  {qaHistory.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{qaHistory.length}</Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={qaExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              
              {qaExpanded && (
                <View style={styles.blockContentContainer}>
                  {/* Show loading state for current question */}
                  {isLoadingAnswer && currentQuestion && (
                    <View style={styles.qaItem}>
                      <Text style={styles.qaQuestion}>Q: {currentQuestion}</Text>
                      <Text style={styles.qaAnswerLoading}>Thinking...</Text>
                    </View>
                  )}
                  
                  {/* Show Q&A history */}
                  {qaHistory.map((qa, index) => (
                    <View key={index} style={styles.qaItem}>
                      <Text style={styles.qaQuestion}>Q: {qa.question}</Text>
                      <Text style={styles.qaAnswer}>A: {qa.answer}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Transcript Window */}
          <View style={styles.transcriptBlock}>
            <TouchableOpacity
              style={styles.blockHeader}
              onPress={() => setTranscriptExpanded(!transcriptExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.headerLabelContainer}>
                <Ionicons name="mic" size={16} color={colors.primary} />
                <Text style={styles.blockTitle}>Live Transcript</Text>
                {isRecording && (
                  <View style={styles.recordingBadge}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingBadgeText}>Recording</Text>
                  </View>
                )}
              </View>
              <Ionicons
                name={transcriptExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            
            {transcriptExpanded && (
              <View style={styles.blockContentContainer}>
                {transcript || partialText ? (
                  <>
                    <Text style={styles.blockContent}>{transcript}</Text>
                    {partialText && (
                      <>
                        <Text style={styles.blockContent}> </Text>
                        <Text style={styles.partialTranscriptContent}>{partialText}</Text>
                      </>
                    )}
                  </>
                ) : (
                  <Text style={styles.blockPlaceholder}>
                    {isRecording 
                      ? 'Listening... start speaking to see transcription'
                      : 'Tap the microphone icon to start recording'}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Notes Section (always visible below transcript) */}
          <View style={styles.notesSection}>
            <View style={styles.notesSectionHeader}>
              <View style={styles.headerLabelContainer}>
                <Ionicons name="document-text" size={16} color={colors.primary} />
                <Text style={styles.blockTitle}>Study Notes</Text>
                {isFinalizingNotes && (
                  <View style={styles.processingBadge}>
                    <Text style={styles.processingBadgeText}>Finalizing...</Text>
                  </View>
                )}
                {!isFinalizingNotes && notesIsFinal && (
                  <View style={styles.finalBadge}>
                    <Text style={styles.finalBadgeText}>Final</Text>
                  </View>
                )}
                {!isFinalizingNotes && !notesIsFinal && notes.length > 0 && (
                  <Text style={styles.liveBadgeText}>Auto-Generating</Text>
                )}
              </View>
            </View>

            <View style={styles.notesContentContainer}>
              {isFinalizingNotes ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.blockPlaceholder}>
                    Finalizing notes with AI...
                  </Text>
                  <Text style={styles.loadingSubtext}>
                    Creating structured study notes
                  </Text>
                </View>
              ) : notes ? (
                <>
                  <Text style={styles.blockContent}>{notes}</Text>
                  {isGeneratingNotes && (
                    <View style={styles.generatingIndicator}>
                      <Ionicons name="refresh" size={14} color={colors.textTertiary} />
                      <Text style={styles.generatingText}>Generating...</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.blockPlaceholder}>
                  {isRecording 
                    ? 'Notes will appear here as you record (updated every 20s)'
                    : 'Start recording to generate notes automatically'}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Ask UI - Bottom Bar */}
        <View style={styles.askContainer}>
          <View style={styles.contextChip}>
            <Text style={styles.contextChipText}>
              Lesson • {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.micButton}
              onPress={() => console.log('Voice input')}
              activeOpacity={0.7}
            >
              <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={askInput}
              onChangeText={setAskInput}
              placeholder="Ask this lesson…"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleAsk}
            />

            <TouchableOpacity
              style={[styles.sendButton, !askInput.trim() && styles.sendButtonDisabled]}
              onPress={handleAsk}
              disabled={!askInput.trim()}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={askInput.trim() ? colors.textPrimary : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Picker Sheet */}
        {translateSheetVisible && (
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setTranslateSheetVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.languageSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.sheetTitle}>Translate to</Text>
              <ScrollView
                style={styles.languageList}
                showsVerticalScrollIndicator={false}
              >
                {['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Portuguese', 'Russian', 'Italian', 'Hindi'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={styles.languageOption}
                    onPress={() => {
                      console.log(`Translate to ${lang}`);
                      setTranslateSheetVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.languageOptionText}>{lang}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  recordingStatus: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Q&A Block
  qaBlock: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  // Transcript Block
  transcriptBlock: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  // Notes Section
  notesSection: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  // Common Block Styles
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
  blockContentContainer: {
    marginTop: spacing.md,
  },
  blockContent: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  blockPlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  partialTranscriptContent: {
    ...typography.body,
    color: colors.textTertiary,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  // Q&A Styles
  qaItem: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  qaQuestion: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  qaAnswer: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  qaAnswerLoading: {
    ...typography.body,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // Notes Section Specific
  notesSectionHeader: {
    marginBottom: spacing.md,
  },
  notesContentContainer: {
    // No extra margin since it's not collapsible
  },
  askContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  contextChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  contextChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  micButton: {
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 100,
    paddingVertical: spacing.xs,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  languageSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  languageList: {
    flex: 1,
  },
  languageOption: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  // Tab styles
  // Badges and Labels
  headerLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  recordingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.error,
  },
  finalBadge: {
    backgroundColor: colors.accentGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  finalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  processingBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  processingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  generatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  generatingText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingSubtext: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  finalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  finalizeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
