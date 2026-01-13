import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { supabase } from '../../config/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../ui/tokens';

interface SettingsScreenProps {
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');
        setUserEmail(user.email || '');
      }
    }
    loadUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        
        <ScrollView style={styles.content}>
          {/* Profile Section */}
          <TouchableOpacity 
            style={styles.profileSection}
            onPress={() => navigation?.navigate('Profile')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </TouchableOpacity>

          {/* Analytics */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.analyticsCard}
              onPress={() => navigation?.navigate('Analytics')}
            >
              <View style={styles.analyticsContent}>
                <Text style={styles.analyticsTitle}>Your Study Analytics</Text>
                <Text style={styles.analyticsDescription}>
                  View your progress and insights
                </Text>
              </View>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
          </View>
          
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation?.navigate('Profile')}
            >
              <Text style={styles.settingLabel}>Profile</Text>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation?.navigate('Notifications')}
            >
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
          </View>
          
          {/* Study Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Study</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation?.navigate('StudyPreferences')}
            >
              <Text style={styles.settingLabel}>Study Preferences</Text>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation?.navigate('Language')}
            >
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
          </View>
          
          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation?.navigate('HelpSupport')}
            >
              <Text style={styles.settingLabel}>Help & Support</Text>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation?.navigate('PrivacyPolicy')}
            >
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation?.navigate('TermsOfService')}
            >
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Text style={styles.settingIcon}>›</Text>
            </TouchableOpacity>
          </View>
          
          {/* Sign Out */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0,
  },
  analyticsDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: 0,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  section: {
    marginBottom: spacing.lg,
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
  settingLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  settingIcon: {
    fontSize: 18,
    color: colors.textTertiary,
  },
  signOutButton: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    ...shadows.none,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.error,
    letterSpacing: 0,
  },
});
