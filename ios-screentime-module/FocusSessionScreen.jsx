import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import FocusSessionManager from './FocusSessionManager';

const FocusSessionScreen = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    initializeManager();
  }, []);

  const initializeManager = async () => {
    try {
      const result = await FocusSessionManager.initialize();
      
      if (result.success) {
        setIsInitialized(true);
        setNeedsAuth(false);
      } else if (result.needsAuth) {
        setNeedsAuth(true);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to initialize Focus Session Manager');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAuthorization = async () => {
    try {
      setIsLoading(true);
      await FocusSessionManager.requestScreenTimeAuthorization();
      await initializeManager();
      Alert.alert('Success', 'Screen Time access granted!');
    } catch (error) {
      console.error('Authorization error:', error);
      Alert.alert(
        'Authorization Failed',
        'Please grant Screen Time access in Settings to use this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      setIsLoading(true);

      const config = {
        sessionName: 'Deep Work Session',
        durationMinutes: 60,
        usageLimit: 15,
        blockedApps: [
          'com.zhiliaoapp.musically', // TikTok
          'com.burbn.instagram',      // Instagram
          'com.twitter.twitter',      // Twitter/X
          'com.facebook.Facebook',    // Facebook
        ],
      };

      const result = await FocusSessionManager.startFocusSession(config);
      
      if (result.success) {
        setCurrentSession(result.session);
        Alert.alert(
          'Session Started',
          `Your ${config.sessionName} has begun. Stay focused!`
        );
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      Alert.alert('Error', 'Failed to start focus session: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    Alert.alert(
      'End Session?',
      'Are you sure you want to end your focus session early?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await FocusSessionManager.endFocusSession();
              
              if (result.success) {
                setCurrentSession(null);
                Alert.alert(
                  'Session Complete',
                  `You completed ${result.summary.completedPercentage.toFixed(0)}% of your session!`
                );
              }
            } catch (error) {
              console.error('Failed to end session:', error);
              Alert.alert('Error', 'Failed to end session');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleScheduleDailyReminder = async () => {
    try {
      const result = await FocusSessionManager.scheduleDailyReminder(9, 0);
      
      if (result.success) {
        Alert.alert(
          'Reminder Scheduled',
          `You'll receive a daily reminder at 9:00 AM`
        );
      }
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      Alert.alert('Error', 'Failed to schedule reminder');
    }
  };

  const formatTimeRemaining = () => {
    if (!currentSession) return '';

    const now = Date.now();
    const remaining = currentSession.endTime - now;
    
    if (remaining <= 0) return 'Session complete!';

    const minutes = Math.floor(remaining / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (needsAuth && !isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.authCard}>
          <Text style={styles.title}>Screen Time Access Required</Text>
          <Text style={styles.description}>
            To use Focus Sessions, we need permission to monitor your screen time.
            This helps us remind you when you've exceeded your usage limits.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRequestAuthorization}
          >
            <Text style={styles.primaryButtonText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Focus Sessions</Text>
        <Text style={styles.subtitle}>
          Minimize distractions and stay productive
        </Text>
      </View>

      {currentSession ? (
        <View style={styles.sessionCard}>
          <View style={styles.sessionStatus}>
            <View style={styles.statusIndicator} />
            <Text style={styles.sessionActive}>Session Active</Text>
          </View>
          
          <Text style={styles.sessionName}>{currentSession.sessionName}</Text>
          <Text style={styles.timeRemaining}>{formatTimeRemaining()}</Text>
          
          <View style={styles.sessionDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {currentSession.durationMinutes} min
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Usage Limit</Text>
              <Text style={styles.detailValue}>
                {currentSession.usageLimit} min
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleEndSession}
            disabled={isLoading}
          >
            <Text style={styles.dangerButtonText}>End Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No active session</Text>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartSession}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>Start Focus Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleScheduleDailyReminder}
          >
            <Text style={styles.secondaryButtonText}>
              Schedule Daily Reminder
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsButtonText}>
            Open Screen Time Settings
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  authCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  sessionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  sessionActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  sessionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  timeRemaining: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default FocusSessionScreen;
