import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/config/supabase';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors, spacing } from './src/ui/tokens';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('user1@test.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      setSession(data.session);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSigningIn(false);
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authContent}>
          <Text style={styles.authTitle}>Welcome to Study OS</Text>
          <Text style={styles.authSubtitle}>Sign in to continue</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity 
              style={[styles.signInButton, signingIn && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={signingIn}
              activeOpacity={0.8}
            >
              {signingIn ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
        </TouchableOpacity>

            <Text style={styles.helperText}>
              Test account: user1@test.com / password123
          </Text>
          </View>
        </View>
    </SafeAreaView>
  );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  authContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  authContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 0,
  },
  authSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 0,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    letterSpacing: 0,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  signInButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  helperText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: 0,
  },
});
