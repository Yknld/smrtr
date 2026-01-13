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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../ui/tokens';
import {
  fetchQuiz,
  generateFlashcardsAndQuiz,
  QuizQuestion,
} from '../../data/lessonOutputs.repository';

interface QuizScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
    };
  };
  navigation: any;
}

interface Question {
  id: string;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ route, navigation }) => {
  const { lessonId, lessonTitle } = route.params;
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [showFinalScore, setShowFinalScore] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [lessonId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      // Fetch existing quiz from the database
      const quizOutput = await fetchQuiz(lessonId);
      
      if (quizOutput && quizOutput.status === 'ready') {
        // Quiz exists and is ready
        const quizQuestions = (quizOutput.contentJson.questions || []).map((q: any, index: number) => ({
          id: `${index + 1}`,
          question: q.question,
          choices: q.options || q.choices,
          correctAnswer: q.correct_answer || q.answer_index,
          explanation: q.explanation,
        }));
        setQuestions(quizQuestions);
      } else {
        // No quiz exists yet
        setQuestions([]);
      }
    } catch (error: any) {
      console.error('Error loading quiz:', error);
      setLoadError(error.message || 'Failed to load quiz');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    try {
      setGenerating(true);
      setLoadError(null);
      
      // Call the edge function to generate flashcards and quiz
      const { quiz: quizOutput } = await generateFlashcardsAndQuiz(lessonId, 15);
      
      if (quizOutput.status === 'ready') {
        const quizQuestions = (quizOutput.contentJson.questions || []).map((q: any, index: number) => ({
          id: `${index + 1}`,
          question: q.question,
          choices: q.options || q.choices,
          correctAnswer: q.correct_answer || q.answer_index,
          explanation: q.explanation,
        }));
        setQuestions(quizQuestions);
        setGenerating(false);
      } else {
        throw new Error('Quiz generation failed');
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      setLoadError(error.message || 'Failed to generate quiz');
      setGenerating(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleChoiceSelect = (index: number) => {
    if (!showExplanation) {
      setSelectedChoice(index);
    }
  };

  const handleSubmit = () => {
    if (selectedChoice === null) return;

    setShowExplanation(true);
    if (selectedChoice === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setShowFinalScore(true);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedChoice(null);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedChoice(null);
    setShowExplanation(false);
    setScore(0);
    setShowFinalScore(false);
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (loadError && !generating) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Failed to Load</Text>
            <Text style={styles.emptySubtitle}>{loadError}</Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => {
                setLoadError(null);
                loadQuiz();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.generateButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - no quiz
  if (questions.length === 0 && !generating) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="help-circle-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No quiz yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a quiz from your lesson content to test your knowledge
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateQuiz}
              activeOpacity={0.7}
            >
              <Text style={styles.generateButtonText}>Generate Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Generating state
  if (generating) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
            <Text style={styles.loadingText}>Generating quiz...</Text>
            <Text style={styles.loadingSubtext}>This may take 5-15 seconds</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showFinalScore) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.finalScoreContainer}>
            <Text style={styles.finalScoreTitle}>Quiz Complete</Text>
            
            <View style={styles.scoreCircle}>
              <Text style={styles.scorePercentage}>{percentage}%</Text>
              <Text style={styles.scoreDetail}>
                {score} / {questions.length}
              </Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRestart}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {questions.length}
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          {/* Choices */}
          <View style={styles.choicesContainer}>
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = selectedChoice === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrect = showExplanation && isCorrect;
              const showIncorrect = showExplanation && isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonSelected,
                    showCorrect && styles.choiceButtonCorrect,
                    showIncorrect && styles.choiceButtonIncorrect,
                  ]}
                  onPress={() => handleChoiceSelect(index)}
                  activeOpacity={0.7}
                  disabled={showExplanation}
                >
                  <View style={styles.choiceContent}>
                    <View
                      style={[
                        styles.choiceRadio,
                        isSelected && styles.choiceRadioSelected,
                        showCorrect && styles.choiceRadioCorrect,
                        showIncorrect && styles.choiceRadioIncorrect,
                      ]}
                    >
                      {showCorrect && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                      {showIncorrect && (
                        <Ionicons name="close" size={16} color="#fff" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.choiceText,
                        isSelected && styles.choiceTextSelected,
                      ]}
                    >
                      {choice}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation */}
          {showExplanation && (
            <View style={styles.explanationCard}>
              <View style={styles.explanationHeader}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.info}
                />
                <Text style={styles.explanationTitle}>Explanation</Text>
              </View>
              <Text style={styles.explanationText}>
                {currentQuestion.explanation}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          {!showExplanation ? (
            <TouchableOpacity
              style={[
                styles.submitButton,
                selectedChoice === null && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={selectedChoice === null}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {isLastQuestion ? 'View Results' : 'Next Question'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  questionCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    minHeight: 120,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 28,
  },
  choicesContainer: {
    gap: spacing.md,
  },
  choiceButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  choiceButtonCorrect: {
    borderColor: colors.success,
    backgroundColor: '#1F2920',
  },
  choiceButtonIncorrect: {
    borderColor: colors.error,
    backgroundColor: '#2A1F1F',
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  choiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceRadioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  choiceRadioCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  choiceRadioIncorrect: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  choiceText: {
    flex: 1,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  choiceTextSelected: {
    color: colors.textPrimary,
  },
  explanationCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  finalScoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  finalScoreTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl * 2,
    borderWidth: 2,
    borderColor: colors.border,
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreDetail: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  buttonGroup: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  loadingSubtext: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  generateButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
});
