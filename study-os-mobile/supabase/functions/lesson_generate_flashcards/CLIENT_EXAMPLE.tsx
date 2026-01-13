/**
 * Client Integration Example for lesson_generate_flashcards
 * 
 * This file demonstrates how to integrate the flashcard generation
 * function into a React Native mobile app.
 */

import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase'; // Your Supabase client

// ============================================================================
// Types
// ============================================================================

interface Flashcard {
  front: string;
  back: string;
}

interface QuizQuestion {
  q: string;
  choices: string[];
  answer_index: number;
  explanation: string;
}

interface LessonOutput {
  id: string;
  user_id: string;
  lesson_id: string;
  type: 'flashcards' | 'quiz';
  status: 'queued' | 'ready' | 'failed';
  content_json: {
    cards?: Flashcard[];
    questions?: QuizQuestion[];
  };
  created_at: string;
  updated_at: string;
}

interface GenerateFlashcardsResponse {
  flashcards: LessonOutput;
  quiz: LessonOutput;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Check if flashcards already exist for a lesson
 */
async function getExistingFlashcards(
  lessonId: string
): Promise<LessonOutput | null> {
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('type', 'flashcards')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching existing flashcards:', error);
    return null;
  }

  return data;
}

/**
 * Check if quiz already exists for a lesson
 */
async function getExistingQuiz(lessonId: string): Promise<LessonOutput | null> {
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('type', 'quiz')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching existing quiz:', error);
    return null;
  }

  return data;
}

/**
 * Generate new flashcards and quiz for a lesson
 */
async function generateFlashcards(
  lessonId: string,
  count: number = 15
): Promise<GenerateFlashcardsResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'lesson_generate_flashcards',
      {
        body: {
          lesson_id: lessonId,
          count: count,
        },
      }
    );

    if (error) {
      console.error('Error generating flashcards:', error);
      throw error;
    }

    return data as GenerateFlashcardsResponse;
  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
}

/**
 * Get flashcards for a lesson (existing or generate new)
 */
async function getOrGenerateFlashcards(
  lessonId: string,
  count: number = 15,
  forceRegenerate: boolean = false
): Promise<{
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
} | null> {
  // Check for existing unless forcing regeneration
  if (!forceRegenerate) {
    const existingFlashcards = await getExistingFlashcards(lessonId);
    const existingQuiz = await getExistingQuiz(lessonId);

    if (existingFlashcards && existingQuiz) {
      return {
        flashcards: existingFlashcards.content_json.cards || [],
        quiz: existingQuiz.content_json.questions || [],
      };
    }
  }

  // Generate new
  const result = await generateFlashcards(lessonId, count);
  if (!result) {
    return null;
  }

  return {
    flashcards: result.flashcards.content_json.cards || [],
    quiz: result.quiz.content_json.questions || [],
  };
}

// ============================================================================
// React Component Example
// ============================================================================

interface FlashcardScreenProps {
  lessonId: string;
  lessonTitle: string;
}

export function FlashcardScreen({ lessonId, lessonTitle }: FlashcardScreenProps) {
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateFlashcards = async (forceRegenerate: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getOrGenerateFlashcards(lessonId, 15, forceRegenerate);

      if (!result) {
        setError('Failed to generate flashcards. Please try again.');
        return;
      }

      setFlashcards(result.flashcards);
      setQuiz(result.quiz);

      Alert.alert(
        'Success',
        `Generated ${result.flashcards.length} flashcards and ${result.quiz.length} quiz questions!`
      );
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        {lessonTitle}
      </Text>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Generating flashcards...</Text>
        </View>
      ) : (
        <>
          {error && (
            <View style={{ padding: 12, backgroundColor: '#fee', marginBottom: 16 }}>
              <Text style={{ color: '#c00' }}>{error}</Text>
            </View>
          )}

          {flashcards.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ marginBottom: 16, textAlign: 'center' }}>
                No flashcards generated yet.
              </Text>
              <Button
                title="Generate Flashcards"
                onPress={() => handleGenerateFlashcards(false)}
              />
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                Flashcards ({flashcards.length})
              </Text>
              {/* Render flashcards here */}
              
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 8 }}>
                Quiz ({quiz.length} questions)
              </Text>
              {/* Render quiz here */}

              <Button
                title="Regenerate"
                onPress={() => handleGenerateFlashcards(true)}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example 1: Simple generation
 */
async function example1() {
  const lessonId = '123e4567-e89b-12d3-a456-426614174000';
  
  const result = await generateFlashcards(lessonId, 20);
  
  if (result) {
    console.log('Flashcards:', result.flashcards.content_json.cards);
    console.log('Quiz:', result.quiz.content_json.questions);
  }
}

/**
 * Example 2: Check existing before generating
 */
async function example2() {
  const lessonId = '123e4567-e89b-12d3-a456-426614174000';
  
  // Check if already exists
  const existing = await getExistingFlashcards(lessonId);
  
  if (existing) {
    console.log('Using existing flashcards');
    console.log(existing.content_json.cards);
  } else {
    console.log('Generating new flashcards');
    const result = await generateFlashcards(lessonId);
    if (result) {
      console.log(result.flashcards.content_json.cards);
    }
  }
}

/**
 * Example 3: Error handling
 */
async function example3() {
  const lessonId = '123e4567-e89b-12d3-a456-426614174000';
  
  try {
    const result = await generateFlashcards(lessonId, 15);
    
    if (!result) {
      // Handle error
      Alert.alert('Error', 'Failed to generate flashcards');
      return;
    }
    
    // Success
    const cards = result.flashcards.content_json.cards || [];
    const questions = result.quiz.content_json.questions || [];
    
    console.log(`Generated ${cards.length} flashcards`);
    console.log(`Generated ${questions.length} quiz questions`);
    
  } catch (error: any) {
    // Handle specific error codes
    if (error.message?.includes('NO_CONTENT')) {
      Alert.alert(
        'No Content',
        'This lesson needs to be transcribed before generating flashcards.'
      );
    } else if (error.message?.includes('UNAUTHORIZED')) {
      Alert.alert('Error', 'Please sign in to generate flashcards.');
    } else {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  }
}

/**
 * Example 4: Custom count with validation
 */
async function example4(count: number) {
  const lessonId = '123e4567-e89b-12d3-a456-426614174000';
  
  // Validate count client-side
  if (count < 10 || count > 25) {
    Alert.alert('Invalid Count', 'Please choose between 10 and 25 flashcards.');
    return;
  }
  
  const result = await generateFlashcards(lessonId, count);
  
  if (result) {
    console.log(`Generated ${count} flashcards as requested`);
  }
}

/**
 * Example 5: Batch processing for multiple lessons
 */
async function example5(lessonIds: string[]) {
  const results = await Promise.allSettled(
    lessonIds.map(id => generateFlashcards(id, 15))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Generated flashcards for ${successful} lessons`);
  console.log(`Failed for ${failed} lessons`);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Delete flashcards for a lesson
 */
async function deleteFlashcards(lessonId: string): Promise<boolean> {
  const { error } = await supabase
    .from('lesson_outputs')
    .delete()
    .eq('lesson_id', lessonId)
    .in('type', ['flashcards', 'quiz']);

  if (error) {
    console.error('Error deleting flashcards:', error);
    return false;
  }

  return true;
}

/**
 * Get all lesson outputs for a lesson
 */
async function getAllLessonOutputs(lessonId: string): Promise<LessonOutput[]> {
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lesson outputs:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if lesson has content (transcript)
 */
async function lessonHasContent(lessonId: string): Promise<boolean> {
  // Check for study sessions with transcript segments
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('lesson_id', lessonId)
    .limit(1);

  if (!sessions || sessions.length === 0) {
    return false;
  }

  const { data: segments } = await supabase
    .from('live_transcript_segments')
    .select('id')
    .eq('study_session_id', sessions[0].id)
    .limit(1);

  return segments && segments.length > 0;
}

export {
  // Main functions
  generateFlashcards,
  getExistingFlashcards,
  getExistingQuiz,
  getOrGenerateFlashcards,
  
  // Utility functions
  deleteFlashcards,
  getAllLessonOutputs,
  lessonHasContent,
  
  // Types
  type Flashcard,
  type QuizQuestion,
  type LessonOutput,
  type GenerateFlashcardsResponse,
};
