import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../ui/tokens';
import {
  fetchFlashcards,
  generateFlashcardsAndQuiz,
  Flashcard,
} from '../../data/lessonOutputs.repository';

interface FlashcardsScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
    };
  };
  navigation: any;
}

interface FlashcardStats {
  known: number;
  unknown: number;
}

export const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({ route, navigation }) => {
  const { lessonId, lessonTitle } = route.params;
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState<FlashcardStats>({ known: 0, unknown: 0 });
  const [showSummary, setShowSummary] = useState(false);
  
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadFlashcards();
  }, [lessonId]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      // Fetch existing flashcards from the database
      const flashcardsOutput = await fetchFlashcards(lessonId);
      
      if (flashcardsOutput && flashcardsOutput.status === 'ready') {
        // Flashcards exist and are ready
        setFlashcards(flashcardsOutput.contentJson.cards || []);
      } else {
        // No flashcards exist yet
        setFlashcards([]);
      }
    } catch (error: any) {
      console.error('Error loading flashcards:', error);
      setLoadError(error.message || 'Failed to load flashcards');
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async () => {
    try {
      setGenerating(true);
      setLoadError(null);
      
      // Call the edge function to generate flashcards and quiz
      const { flashcards: flashcardsOutput } = await generateFlashcardsAndQuiz(lessonId, 15);
      
      if (flashcardsOutput.status === 'ready') {
        setFlashcards(flashcardsOutput.contentJson.cards || []);
        setGenerating(false);
      } else {
        throw new Error('Flashcard generation failed');
      }
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      setLoadError(error.message || 'Failed to generate flashcards');
      setGenerating(false);
    }
  };

  const flipCard = () => {
    if (showSummary) return;
    
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    
    setIsFlipped(!isFlipped);
  };

  const handleKnow = () => {
    setStats(prev => ({ ...prev, known: prev.known + 1 }));
    nextCard();
  };

  const handleDontKnow = () => {
    setStats(prev => ({ ...prev, unknown: prev.unknown + 1 }));
    nextCard();
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      // Reset flip state
      setIsFlipped(false);
      flipAnimation.setValue(0);
      setCurrentIndex(currentIndex + 1);
    } else {
      // Show summary
      setShowSummary(true);
    }
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    flipAnimation.setValue(0);
    setStats({ known: 0, unknown: 0 });
    setShowSummary(false);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - no flashcards
  if (flashcards.length === 0 && !generating) {
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
            <Text style={styles.headerTitle}>Flashcards</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Empty state */}
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="layers-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No flashcards yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate flashcards from your lesson content to start reviewing
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateFlashcards}
              activeOpacity={0.7}
            >
              <Text style={styles.generateButtonText}>Generate Flashcards</Text>
            </TouchableOpacity>
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Flashcards</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Error state */}
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
                loadFlashcards();
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
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Flashcards</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
            <Text style={styles.loadingText}>Generating flashcards...</Text>
            <Text style={styles.loadingSubtext}>This may take 5-15 seconds</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Summary screen
  if (showSummary) {
    const total = stats.known + stats.unknown;
    const knownPercentage = total > 0 ? Math.round((stats.known / total) * 100) : 0;

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
            <Text style={styles.headerTitle}>Flashcards</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <Text style={styles.summaryTitle}>Deck Complete</Text>
              <Text style={styles.summarySubtitle}>
                You've reviewed all {total} cards
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.known}</Text>
                <Text style={styles.statLabel}>Known</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.unknown}</Text>
                <Text style={styles.statLabel}>Review Again</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{knownPercentage}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>

            <View style={styles.summaryActions}>
              <TouchableOpacity
                style={styles.summaryButtonPrimary}
                onPress={resetDeck}
                activeOpacity={0.7}
              >
                <Text style={styles.summaryButtonTextPrimary}>Review Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.summaryButtonSecondary}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Text style={styles.summaryButtonTextSecondary}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main flashcard view
  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

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
          <Text style={styles.headerTitle}>Flashcards</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {flashcards.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Card */}
        <View style={styles.cardContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={flipCard}
            style={styles.cardTouchable}
          >
            <View style={styles.cardWrapper}>
              {/* Front of card */}
              <Animated.View
                style={[
                  styles.card,
                  {
                    transform: [{ rotateY: frontInterpolate }],
                    opacity: frontOpacity,
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Question</Text>
                  <ScrollView 
                    style={styles.cardTextScroll}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle="white"
                  >
                    <Text style={styles.cardText}>{currentCard.front}</Text>
                  </ScrollView>
                  <View style={styles.tapHint}>
                    <Ionicons name="sync-outline" size={16} color={colors.textTertiary} />
                    <Text style={styles.tapHintText}>Tap to flip</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Back of card */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardBack,
                  {
                    transform: [{ rotateY: backInterpolate }],
                    opacity: backOpacity,
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Answer</Text>
                  <ScrollView 
                    style={styles.cardTextScroll}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle="white"
                  >
                    <Text style={styles.cardText}>{currentCard.back}</Text>
                  </ScrollView>
                </View>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        {isFlipped && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDontKnow]}
              onPress={handleDontKnow}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
              <Text style={styles.actionButtonText}>Don't Know</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonKnow]}
              onPress={handleKnow}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={24} color={colors.textPrimary} />
              <Text style={styles.actionButtonText}>Know</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
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
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: -0.1,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  cardTouchable: {
    width: '100%',
    aspectRatio: 1.4,
    maxWidth: 500,
    maxHeight: 400,
  },
  cardWrapper: {
    flex: 1,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
  },
  cardContent: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  cardTextScroll: {
    flex: 1,
    marginBottom: spacing.xl,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  tapHint: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tapHintText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  actionButtonKnow: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderDark,
  },
  actionButtonDontKnow: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderDark,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  summaryContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  summarySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryActions: {
    gap: spacing.md,
  },
  summaryButtonPrimary: {
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
  },
  summaryButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  summaryButtonSecondary: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  summaryButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },
});
