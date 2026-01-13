import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { AssemblyLiveService, TranscriptEvent } from '../../services/assemblyLive';
import { translationService } from '../../services/geminiTranslation';
import { preferencesStore } from '../../state/preferences.store';
import { SUPPORTED_LANGUAGES } from '../../components/LanguageSelector/LanguageSelector';

/**
 * Animated waveform icon that pulses while recording
 */
const WaveformIcon = ({ isRecording }: { isRecording: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulsing animation: scale from 1 to 1.2 and back
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
    } else {
      // Reset animation
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path
          d="M9 4C9 2.34315 7.65685 1 6 1C4.34315 1 3 2.34315 3 4V12C3 13.6569 4.34315 15 6 15C7.65685 15 9 13.6569 9 12V4Z"
          fill={isRecording ? "#C5C5C5" : "#5A5A5A"}
        />
        <Path
          d="M15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8V16C9 17.6569 10.3431 19 12 19C13.6569 19 15 17.6569 15 16V8Z"
          fill={isRecording ? "#C5C5C5" : "#5A5A5A"}
        />
        <Path
          d="M21 4C21 2.34315 19.6569 1 18 1C16.3431 1 15 2.34315 15 4V12C15 13.6569 16.3431 15 18 15C19.6569 15 21 13.6569 21 12V4Z"
          fill={isRecording ? "#C5C5C5" : "#5A5A5A"}
        />
      </Svg>
    </Animated.View>
  );
};

interface LiveTranscriptionScreenProps {
  onBack?: () => void;
}

export default function LiveTranscriptionScreen({ onBack }: LiveTranscriptionScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>('Ready');
  const [transcript, setTranscript] = useState<string>('');
  const [partialText, setPartialText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const assemblyServiceRef = useRef<AssemblyLiveService | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Translation buffer state
  const sentenceBufferRef = useRef<string>('');
  const incompleteSentenceRef = useRef<string>('');
  const translationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranslationRef = useRef<string>('');
  const contextSentencesRef = useRef<string[]>([]);
  
  // Load language preference on mount
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (assemblyServiceRef.current) {
        assemblyServiceRef.current.stop();
      }
      if (translationTimerRef.current) {
        clearTimeout(translationTimerRef.current);
      }
    };
  }, []);

  // Start translation timer when recording starts and language is not English
  useEffect(() => {
    if (isRecording && targetLanguage !== 'en') {
      startTranslationTimer();
    } else {
      stopTranslationTimer();
    }
    
    return () => stopTranslationTimer();
  }, [isRecording, targetLanguage]);

  const loadLanguagePreference = async () => {
    try {
      const prefs = await preferencesStore.load();
      setTargetLanguage(prefs.contentLanguage);
    } catch (error) {
      console.error('[LiveTranscription] Error loading language:', error);
    }
  };

  const startTranslationTimer = () => {
    // Translate every 3 seconds
    translationTimerRef.current = setInterval(() => {
      translateBuffer();
    }, 3000);
  };

  const stopTranslationTimer = () => {
    if (translationTimerRef.current) {
      clearInterval(translationTimerRef.current);
      translationTimerRef.current = null;
    }
  };

  const translateBuffer = async () => {
    // Only translate if we have complete sentences
    const buffer = sentenceBufferRef.current.trim();
    if (!buffer || targetLanguage === 'en') return;

    const { complete, remaining } = translationService.extractCompleteSentences(buffer);
    
    // Only translate if we have complete sentences
    if (!complete) return;

    setIsTranslating(true);
    
    try {
      // Translate with context from previous sentences
      const result = await translationService.translate(
        complete,
        targetLanguage,
        {
          previousSentences: contextSentencesRef.current.slice(-3), // Last 3 sentences for context
          topic: 'Live lecture or conversation',
        }
      );

      // Update translated text
      setTranslatedText(prev => {
        const newText = prev ? `${prev} ${result.translatedText}` : result.translatedText;
        return newText;
      });

      // Update context with English sentences
      contextSentencesRef.current.push(complete);
      if (contextSentencesRef.current.length > 10) {
        contextSentencesRef.current = contextSentencesRef.current.slice(-10); // Keep last 10
      }

      // Update buffer to only keep remaining incomplete sentence
      sentenceBufferRef.current = remaining;
      lastTranslationRef.current = complete;

    } catch (error) {
      console.error('[LiveTranscription] Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  /**
   * Handle transcript events from AssemblyAI
   */
  const handleTranscriptEvent = (event: TranscriptEvent) => {
    switch (event.type) {
      case 'connected':
        setStatus('Connected - listening...');
        break;
      
      case 'partial':
        // Update partial text (gray, italic) - doesn't append to final
        if (event.text) {
          setPartialText(event.text);
          // Auto-scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
        break;
      
      case 'final':
        // Append to final transcript and clear partial
        if (event.text) {
          const finalText = event.text;
          setTranscript(prev => prev ? `${prev} ${finalText}` : finalText || '');
          setPartialText('');
          
          // Add to translation buffer
          if (targetLanguage !== 'en') {
            sentenceBufferRef.current += (sentenceBufferRef.current ? ' ' : '') + finalText;
          }
          
          // Auto-scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
        break;
      
      case 'error':
        setStatus(`Error: ${event.error}`);
        Alert.alert('Transcription Error', event.error || 'Unknown error');
        break;
      
      case 'disconnected':
        setStatus('Disconnected');
        break;
    }
  };

  const startRecording = async () => {
    try {
      setStatus('Starting...');
      setTranscript('');
      setPartialText('');
      setTranslatedText('');
      sentenceBufferRef.current = '';
      incompleteSentenceRef.current = '';
      contextSentencesRef.current = [];
      lastTranslationRef.current = '';

      // Check auth before starting
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (!session || authError) {
        Alert.alert(
          'Authentication Required',
          'Please go back and sign in first using the "1️⃣ Sign In" button.',
          [{ text: 'OK' }]
        );
        setStatus('Not authenticated');
        return;
      }

      // Create new AssemblyAI service instance
      assemblyServiceRef.current = new AssemblyLiveService(handleTranscriptEvent);

      // Start streaming transcription
      await assemblyServiceRef.current.start();
      
      setIsRecording(true);
      setStatus('Recording...');
      console.log('AssemblyAI live transcription started');

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      
      // Better error messages
      let errorMessage = error.message;
      if (errorMessage.includes('Invalid JWT')) {
        errorMessage = 'Session expired. Please go back and sign in again.';
      }
      
      Alert.alert('Error', errorMessage);
      setStatus('Error');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setStatus('Stopping...');

      // Translate any remaining buffer before stopping
      if (targetLanguage !== 'en' && sentenceBufferRef.current) {
        await translateBuffer();
      }

      // Stop the AssemblyAI service
      const sessionId = await assemblyServiceRef.current?.stop();
      
      setIsRecording(false);
      setStatus('Processing...');

      // Persist final transcript to Supabase
      if (sessionId && transcript) {
        await persistTranscript(sessionId, transcript);
        setStatus('Complete');
      } else {
        setStatus('Complete (no transcript)');
      }

      console.log('Recording stopped');
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', `Failed to stop: ${error.message}`);
      setStatus('Error');
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        
        {/* Title with waveform icon */}
        <View style={styles.titleRow}>
          <WaveformIcon isRecording={isRecording} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Live Transcription</Text>
            <Text style={styles.status}>
              {status}
              {targetLanguage !== 'en' && (
                ` • ${SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage}`
              )}
            </Text>
          </View>
          {isTranslating && (
            <Ionicons name="sync" size={20} color="#8A8A8A" />
          )}
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.transcriptContainer}
        contentContainerStyle={styles.transcriptContent}
      >
        {transcript || partialText ? (
          <>
            {/* English Transcript */}
            <View style={styles.languageSection}>
              <Text style={styles.languageLabel}>English</Text>
              <Text style={styles.finalText}>{transcript}</Text>
              {partialText && (
                <>
                  <Text style={styles.finalText}> </Text>
                  <Text style={styles.partialText}>{partialText}</Text>
                </>
              )}
            </View>

            {/* Translated Text (if language is not English) */}
            {targetLanguage !== 'en' && (
              <View style={[styles.languageSection, styles.translationSection]}>
                <Text style={styles.languageLabel}>
                  {SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'Translation'}
                </Text>
                {translatedText ? (
                  <Text style={styles.translatedText}>{translatedText}</Text>
                ) : (
                  <Text style={styles.translationPlaceholder}>
                    Translation will appear here...
                  </Text>
                )}
                {isTranslating && (
                  <Text style={styles.translatingHint}>Translating...</Text>
                )}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.placeholder}>
            Tap Start Recording to begin
            {'\n\n'}
            Real-time transcription will appear here as you speak
            {targetLanguage !== 'en' && (
              '\n\nTranslation to ' + 
              (SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage) + 
              ' will be shown below'
            )}
          </Text>
        )}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={status === 'Starting...' || status === 'Stopping...'}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F1F1F',
  },
  header: {
    padding: 20,
    backgroundColor: '#252525',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#8A8A8A',
    letterSpacing: -0.3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#C5C5C5',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  status: {
    fontSize: 13,
    color: '#8A8A8A',
    letterSpacing: -0.2,
  },
  transcriptContainer: {
    flex: 1,
    padding: 20,
  },
  transcriptContent: {
    flexGrow: 1,
  },
  languageSection: {
    marginBottom: 24,
  },
  translationSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  languageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  finalText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#C5C5C5',
    letterSpacing: -0.3,
  },
  partialText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#5A5A5A',
    fontStyle: 'italic',
    letterSpacing: -0.3,
  },
  translatedText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#8B9DC3',
    letterSpacing: -0.3,
  },
  translationPlaceholder: {
    fontSize: 14,
    color: '#5A5A5A',
    fontStyle: 'italic',
    letterSpacing: -0.2,
  },
  translatingHint: {
    fontSize: 12,
    color: '#5A5A5A',
    marginTop: 8,
    fontStyle: 'italic',
    letterSpacing: -0.1,
  },
  placeholder: {
    fontSize: 15,
    color: '#5A5A5A',
    textAlign: 'center',
    marginTop: 60,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  controls: {
    padding: 20,
    backgroundColor: '#252525',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  recordButton: {
    backgroundColor: '#333333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  recordButtonActive: {
    backgroundColor: '#3A3A3A',
    borderColor: '#4A4A4A',
  },
  recordButtonText: {
    color: '#C5C5C5',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
});
