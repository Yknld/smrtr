import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../ui/tokens';

interface TermsOfServiceScreenProps {
  navigation: any;
}

export const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ navigation }) => {
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
          <Text style={styles.title}>Terms of Service</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.lastUpdated}>Last updated: January 11, 2026</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agreement to Terms</Text>
            <Text style={styles.paragraph}>
              By accessing or using Smartr, you agree to be bound by these Terms of 
              Service. If you disagree with any part of these terms, you may not access 
              the service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Use of Service</Text>
            <Text style={styles.paragraph}>
              You may use our service only as permitted by law. You agree not to:
            </Text>
            <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
            <Text style={styles.bulletPoint}>• Infringe on intellectual property rights</Text>
            <Text style={styles.bulletPoint}>• Upload malicious content</Text>
            <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access</Text>
            <Text style={styles.bulletPoint}>• Use the service for commercial purposes without permission</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Content</Text>
            <Text style={styles.paragraph}>
              You retain all rights to content you upload to Smartr. By uploading 
              content, you grant us a license to use, store, and process your content 
              to provide our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Intellectual Property</Text>
            <Text style={styles.paragraph}>
              The service and its original content, features, and functionality are 
              owned by Smartr and are protected by international copyright, trademark, 
              and other intellectual property laws.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Termination</Text>
            <Text style={styles.paragraph}>
              We may terminate or suspend your account and access to the service 
              immediately, without prior notice, for any breach of these Terms of Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              In no event shall Smartr be liable for any indirect, incidental, special, 
              consequential, or punitive damages resulting from your use of the service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Changes to Terms</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify these terms at any time. We will notify 
              users of any changes by updating the "Last updated" date.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have questions about these Terms, please contact us at:
            </Text>
            <Text style={styles.contactText}>legal@studyos.app</Text>
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
    paddingHorizontal: spacing.md,
  },
  lastUpdated: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    letterSpacing: 0,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: 0,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
    letterSpacing: 0,
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: spacing.sm,
    marginBottom: 4,
    letterSpacing: 0,
  },
  contactText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.xs,
    letterSpacing: 0,
  },
});
