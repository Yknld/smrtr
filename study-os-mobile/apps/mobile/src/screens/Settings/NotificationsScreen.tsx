import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../ui/tokens';

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [studyReminders, setStudyReminders] = useState(true);
  const [lessonUpdates, setLessonUpdates] = useState(true);
  const [podcastReleases, setPodcastReleases] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);

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
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Push Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Enable Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications on your device
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {pushEnabled && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Study Reminders</Text>
                    <Text style={styles.settingDescription}>
                      Daily reminders to stay on track
                    </Text>
                  </View>
                  <Switch
                    value={studyReminders}
                    onValueChange={setStudyReminders}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Lesson Updates</Text>
                    <Text style={styles.settingDescription}>
                      When lessons are processed
                    </Text>
                  </View>
                  <Switch
                    value={lessonUpdates}
                    onValueChange={setLessonUpdates}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Podcast Releases</Text>
                    <Text style={styles.settingDescription}>
                      When new podcasts are available
                    </Text>
                  </View>
                  <Switch
                    value={podcastReleases}
                    onValueChange={setPodcastReleases}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </>
            )}
          </View>

          {/* Email Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EMAIL NOTIFICATIONS</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Enable Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive updates via email
                </Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {emailEnabled && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Weekly Digest</Text>
                    <Text style={styles.settingDescription}>
                      Summary of your study progress
                    </Text>
                  </View>
                  <Switch
                    value={weeklyDigest}
                    onValueChange={setWeeklyDigest}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Product Updates</Text>
                    <Text style={styles.settingDescription}>
                      New features and improvements
                    </Text>
                  </View>
                  <Switch
                    value={productUpdates}
                    onValueChange={setProductUpdates}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </>
            )}
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
    marginBottom: spacing.sm,
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
});
