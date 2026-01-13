import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../ui/tokens';
import { LanguageSelector } from '../../components/LanguageSelector/LanguageSelector';
import { preferencesStore } from '../../state/preferences.store';

interface StudyPreferencesScreenProps {
  navigation: any;
}

export const StudyPreferencesScreen: React.FC<StudyPreferencesScreenProps> = ({ navigation }) => {
  const [autoPlayPodcasts, setAutoPlayPodcasts] = useState(true);
  const [autoGenerateNotes, setAutoGenerateNotes] = useState(true);
  const [autoGenerateFlashcards, setAutoGenerateFlashcards] = useState(false);
  const [dailyGoalEnabled, setDailyGoalEnabled] = useState(true);
  const [selectedDailyGoal, setSelectedDailyGoal] = useState('30');
  const [selectedPlaybackSpeed, setSelectedPlaybackSpeed] = useState('1.0');
  const [contentLanguage, setContentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await preferencesStore.load();
      setContentLanguage(prefs.contentLanguage);
      setAutoGenerateNotes(prefs.autoGenerateNotes);
      setAutoGenerateFlashcards(prefs.autoGenerateFlashcards);
      setAutoPlayPodcasts(prefs.autoPlayPodcasts);
      setDailyGoalEnabled(prefs.dailyGoalEnabled);
      setSelectedDailyGoal(prefs.dailyGoalMinutes.toString());
      setSelectedPlaybackSpeed(prefs.playbackSpeed.toString());
    } catch (error) {
      console.error('[StudyPreferences] Error loading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreference = async (updates: any) => {
    try {
      await preferencesStore.save(updates);
    } catch (error) {
      console.error('[StudyPreferences] Error saving:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    setContentLanguage(languageCode);
    await savePreference({ contentLanguage: languageCode });
  };

  const handleAutoGenerateNotesChange = async (value: boolean) => {
    setAutoGenerateNotes(value);
    await savePreference({ autoGenerateNotes: value });
  };

  const handleAutoGenerateFlashcardsChange = async (value: boolean) => {
    setAutoGenerateFlashcards(value);
    await savePreference({ autoGenerateFlashcards: value });
  };

  const handleAutoPlayPodcastsChange = async (value: boolean) => {
    setAutoPlayPodcasts(value);
    await savePreference({ autoPlayPodcasts: value });
  };

  const handleDailyGoalEnabledChange = async (value: boolean) => {
    setDailyGoalEnabled(value);
    await savePreference({ dailyGoalEnabled: value });
  };

  const handleDailyGoalChange = async (value: string) => {
    setSelectedDailyGoal(value);
    await savePreference({ dailyGoalMinutes: parseInt(value) });
  };

  const handlePlaybackSpeedChange = async (value: string) => {
    setSelectedPlaybackSpeed(value);
    await savePreference({ playbackSpeed: parseFloat(value) });
  };

  const dailyGoalOptions = [
    { label: '15 minutes', value: '15' },
    { label: '30 minutes', value: '30' },
    { label: '45 minutes', value: '45' },
    { label: '60 minutes', value: '60' },
  ];

  const playbackSpeedOptions = [
    { label: '0.75x', value: '0.75' },
    { label: '1.0x', value: '1.0' },
    { label: '1.25x', value: '1.25' },
    { label: '1.5x', value: '1.5' },
    { label: '1.75x', value: '1.75' },
    { label: '2.0x', value: '2.0' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Study Preferences</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Content Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTENT LANGUAGE</Text>
            <Text style={styles.sectionDescription}>
              Language for generated notes, flashcards, and quizzes
            </Text>
            <View style={styles.languageSelectorContainer}>
              <LanguageSelector
                selectedLanguage={contentLanguage}
                onLanguageChange={handleLanguageChange}
                showLabel={false}
              />
            </View>
          </View>

          {/* Auto-Generation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AUTO-GENERATION</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Auto-generate Notes</Text>
                <Text style={styles.settingDescription}>
                  Create notes when lesson is uploaded
                </Text>
              </View>
              <Switch
                value={autoGenerateNotes}
                onValueChange={handleAutoGenerateNotesChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Auto-generate Flashcards</Text>
                <Text style={styles.settingDescription}>
                  Create flashcards when lesson is uploaded
                </Text>
              </View>
              <Switch
                value={autoGenerateFlashcards}
                onValueChange={handleAutoGenerateFlashcardsChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Auto-play Podcasts</Text>
                <Text style={styles.settingDescription}>
                  Start playing when podcast is ready
                </Text>
              </View>
              <Switch
                value={autoPlayPodcasts}
                onValueChange={handleAutoPlayPodcastsChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Daily Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DAILY GOALS</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Enable Daily Goal</Text>
                <Text style={styles.settingDescription}>
                  Set a daily study time target
                </Text>
              </View>
              <Switch
                value={dailyGoalEnabled}
                onValueChange={handleDailyGoalEnabledChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {dailyGoalEnabled && (
              <View style={styles.optionsContainer}>
                {dailyGoalOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      selectedDailyGoal === option.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleDailyGoalChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedDailyGoal === option.value && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Playback Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PLAYBACK</Text>
            
            <Text style={styles.settingItemLabel}>Default Playback Speed</Text>
            <View style={styles.optionsContainer}>
              {playbackSpeedOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    styles.smallOptionButton,
                    selectedPlaybackSpeed === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => handlePlaybackSpeedChange(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedPlaybackSpeed === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0,
  },
  languageSelectorContainer: {
    paddingHorizontal: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: 0,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  settingItemLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  optionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallOptionButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});
