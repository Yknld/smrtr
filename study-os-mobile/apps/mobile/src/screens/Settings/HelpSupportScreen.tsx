import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../ui/tokens';

interface HelpSupportScreenProps {
  navigation: any;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ navigation }) => {
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@studyos.app?subject=Support Request');
  };

  const handleOpenFAQ = () => {
    Linking.openURL('https://studyos.app/faq');
  };

  const handleOpenDocs = () => {
    Linking.openURL('https://docs.studyos.app');
  };

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
          <Text style={styles.title}>Help & Support</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Quick Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RESOURCES</Text>
            
            <TouchableOpacity style={styles.linkItem} onPress={handleOpenFAQ}>
              <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>FAQ</Text>
                <Text style={styles.linkDescription}>
                  Frequently asked questions
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkItem} onPress={handleOpenDocs}>
              <Ionicons name="document-text-outline" size={24} color={colors.textSecondary} />
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Documentation</Text>
                <Text style={styles.linkDescription}>
                  Learn how to use all features
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT US</Text>
            
            <TouchableOpacity style={styles.linkItem} onPress={handleContactSupport}>
              <Ionicons name="mail-outline" size={24} color={colors.textSecondary} />
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Email Support</Text>
                <Text style={styles.linkDescription}>
                  support@studyos.app
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP INFO</Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2026.01.11</Text>
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
    marginBottom: spacing.sm,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  linkLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: 0,
  },
  linkDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  infoValue: {
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
});
