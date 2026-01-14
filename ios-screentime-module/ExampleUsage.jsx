/**
 * Example Usage File
 * 
 * This file demonstrates various ways to use the Screen Time Module
 * in your React Native app. Copy and adapt these examples to your needs.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { NativeModules } from 'react-native';
import FocusSessionManager from './FocusSessionManager';

const { ScreenTimeModule } = NativeModules;

/**
 * Example 1: Simple Focus Session Button
 * 
 * Minimal implementation - just start and stop sessions
 */
export function SimpleFocusButton() {
  const [isActive, setIsActive] = useState(false);

  const toggleSession = async () => {
    try {
      if (isActive) {
        await FocusSessionManager.endFocusSession();
        setIsActive(false);
        Alert.alert('Session Ended', 'Good work!');
      } else {
        await FocusSessionManager.startFocusSession({
          sessionName: 'Focus Time',
          durationMinutes: 25, // Pomodoro timer
          usageLimit: 5,
          blockedApps: ['com.zhiliaoapp.musically', 'com.burbn.instagram'],
        });
        setIsActive(true);
        Alert.alert('Session Started', 'Time to focus!');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isActive && styles.activeButton]}
      onPress={toggleSession}
    >
      <Text style={styles.buttonText}>
        {isActive ? '⏸ End Session' : '▶️ Start Focus'}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Example 2: Authorization Flow
 * 
 * Handle the complete authorization flow with proper UI feedback
 */
export function AuthorizationFlow() {
  const [authStatus, setAuthStatus] = useState('checking');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const status = await ScreenTimeModule.checkAuthorizationStatus();
      setAuthStatus(status.status);
      setIsAuthorized(status.isAuthorized);
    } catch (error) {
      setAuthStatus('error');
      console.error('Auth check failed:', error);
    }
  };

  const requestAuth = async () => {
    try {
      await ScreenTimeModule.requestAuthorization();
      await checkAuthorization();
    } catch (error) {
      Alert.alert('Authorization Failed', error.message);
    }
  };

  if (authStatus === 'checking') {
    return <Text>Checking permissions...</Text>;
  }

  if (!isAuthorized) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>Screen Time Access Required</Text>
        <Text style={styles.authDescription}>
          Grant access to enable focus session features
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestAuth}>
          <Text style={styles.buttonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.authContainer}>
      <Text style={styles.successText}>✓ Authorized</Text>
    </View>
  );
}

/**
 * Example 3: Custom Session Configuration
 * 
 * Let users customize their focus sessions
 */
export function CustomSessionConfig() {
  const [duration, setDuration] = useState(30);
  const [blockTikTok, setBlockTikTok] = useState(true);
  const [blockInstagram, setBlockInstagram] = useState(true);
  const [blockTwitter, setBlockTwitter] = useState(false);

  const startCustomSession = async () => {
    const blockedApps = [];
    if (blockTikTok) blockedApps.push('com.zhiliaoapp.musically');
    if (blockInstagram) blockedApps.push('com.burbn.instagram');
    if (blockTwitter) blockedApps.push('com.twitter.twitter');

    if (blockedApps.length === 0) {
      Alert.alert('No Apps Selected', 'Please select at least one app to block');
      return;
    }

    try {
      await FocusSessionManager.startFocusSession({
        sessionName: 'Custom Focus',
        durationMinutes: duration,
        usageLimit: Math.floor(duration * 0.25), // 25% of duration
        blockedApps,
      });
      Alert.alert('Success', `${duration}-minute session started!`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView style={styles.configContainer}>
      <Text style={styles.sectionTitle}>Session Duration</Text>
      <View style={styles.durationButtons}>
        {[15, 30, 45, 60].map((mins) => (
          <TouchableOpacity
            key={mins}
            style={[
              styles.durationButton,
              duration === mins && styles.selectedDuration,
            ]}
            onPress={() => setDuration(mins)}
          >
            <Text style={styles.durationText}>{mins}m</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Apps to Block</Text>
      
      <View style={styles.appRow}>
        <Text>TikTok</Text>
        <Switch value={blockTikTok} onValueChange={setBlockTikTok} />
      </View>
      
      <View style={styles.appRow}>
        <Text>Instagram</Text>
        <Switch value={blockInstagram} onValueChange={setBlockInstagram} />
      </View>
      
      <View style={styles.appRow}>
        <Text>Twitter/X</Text>
        <Switch value={blockTwitter} onValueChange={setBlockTwitter} />
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startCustomSession}>
        <Text style={styles.startButtonText}>Start Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/**
 * Example 4: Session Timer Display
 * 
 * Show a live countdown timer during sessions
 */
export function SessionTimer() {
  const [session, setSession] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Check for active session
    const currentSession = FocusSessionManager.getCurrentSession();
    setSession(currentSession);

    // Update timer every second
    const interval = setInterval(() => {
      if (currentSession) {
        const remaining = currentSession.endTime - Date.now();
        setTimeRemaining(Math.max(0, remaining));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!session) {
    return <Text style={styles.noSession}>No active session</Text>;
  }

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerTitle}>{session.sessionName}</Text>
      <Text style={styles.timerDisplay}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Text>
      <Text style={styles.timerSubtext}>
        {timeRemaining === 0 ? 'Session Complete!' : 'Stay focused...'}
      </Text>
    </View>
  );
}

/**
 * Example 5: Direct Native Module Usage
 * 
 * Use the native module directly for advanced features
 */
export function AdvancedNativeUsage() {
  const [usageData, setUsageData] = useState(null);

  const checkUsage = async () => {
    try {
      const now = Date.now();
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const data = await ScreenTimeModule.getScreenUsage(
        ['com.zhiliaoapp.musically', 'com.burbn.instagram'],
        dayStart.getTime(),
        now
      );

      setUsageData(data);
      Alert.alert('Today\'s Usage', JSON.stringify(data, null, 2));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const blockAppsNow = async () => {
    try {
      await ScreenTimeModule.blockApps([
        'com.zhiliaoapp.musically',
        'com.burbn.instagram',
      ]);
      Alert.alert('Success', 'Apps are now blocked');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const unblockApps = async () => {
    try {
      await ScreenTimeModule.unblockApps();
      Alert.alert('Success', 'All apps unblocked');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.advancedContainer}>
      <TouchableOpacity style={styles.button} onPress={checkUsage}>
        <Text style={styles.buttonText}>Check Today's Usage</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={blockAppsNow}>
        <Text style={styles.buttonText}>Block Apps</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={unblockApps}>
        <Text style={styles.buttonText}>Unblock All</Text>
      </TouchableOpacity>

      {usageData && (
        <View style={styles.usageDisplay}>
          <Text style={styles.usageTitle}>Usage Data:</Text>
          <Text>{JSON.stringify(usageData, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Example 6: Scheduled Study Sessions
 * 
 * Pre-schedule focus sessions for specific times
 */
export function ScheduledSessions() {
  const [hasReminder, setHasReminder] = useState(false);

  const scheduleWeekdayReminders = async () => {
    try {
      // Schedule for 9 AM on weekdays
      await FocusSessionManager.scheduleDailyReminder(9, 0);
      setHasReminder(true);
      Alert.alert(
        'Reminder Set',
        'You\'ll receive a daily reminder at 9:00 AM to start a focus session'
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const scheduleAfternoonSession = async () => {
    try {
      // Schedule for 2 PM
      await FocusSessionManager.scheduleDailyReminder(14, 0);
      Alert.alert('Reminder Set', 'Afternoon focus session scheduled at 2:00 PM');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.scheduleContainer}>
      <Text style={styles.scheduleTitle}>Schedule Focus Sessions</Text>

      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={scheduleWeekdayReminders}
      >
        <Text style={styles.scheduleButtonText}>🌅 Morning (9:00 AM)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={scheduleAfternoonSession}
      >
        <Text style={styles.scheduleButtonText}>☀️ Afternoon (2:00 PM)</Text>
      </TouchableOpacity>

      {hasReminder && (
        <Text style={styles.reminderActive}>✓ Reminders Active</Text>
      )}
    </View>
  );
}

// Shared Styles
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 8,
  },
  activeButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authContainer: {
    padding: 20,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  authDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: '600',
  },
  configContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationButton: {
    flex: 1,
    padding: 12,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  selectedDuration: {
    backgroundColor: '#007AFF',
  },
  durationText: {
    fontWeight: '600',
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  startButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  timerContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    margin: 16,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  timerSubtext: {
    fontSize: 14,
    color: '#666',
  },
  noSession: {
    textAlign: 'center',
    padding: 20,
    color: '#999',
  },
  advancedContainer: {
    padding: 16,
  },
  usageDisplay: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  usageTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  scheduleContainer: {
    padding: 16,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  scheduleButton: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reminderActive: {
    marginTop: 16,
    textAlign: 'center',
    color: '#34C759',
    fontWeight: '600',
  },
});
