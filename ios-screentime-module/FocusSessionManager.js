import { NativeModules, Platform, Linking, Alert } from 'react-native';
import notifee, { TriggerType, RepeatFrequency } from '@notifee/react-native';

const { ScreenTimeModule } = NativeModules;

class FocusSessionManager {
  constructor() {
    this.isMonitoring = false;
    this.currentSession = null;
    this.usageCheckInterval = null;
  }

  /**
   * Initialize the module and request necessary permissions
   */
  async initialize() {
    try {
      // Request notification permissions
      await this.requestNotificationPermissions();

      // Check Screen Time authorization status
      if (Platform.OS === 'ios') {
        const status = await ScreenTimeModule.checkAuthorizationStatus();
        console.log('Screen Time Authorization:', status);

        if (!status.isAuthorized) {
          return {
            success: false,
            message: 'Screen Time access not authorized',
            needsAuth: true,
          };
        }
      }

      return {
        success: true,
        message: 'Focus Session Manager initialized',
      };
    } catch (error) {
      console.error('Failed to initialize:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Request Screen Time authorization from user
   */
  async requestScreenTimeAuthorization() {
    if (Platform.OS !== 'ios') {
      throw new Error('Screen Time is only available on iOS');
    }

    try {
      const result = await ScreenTimeModule.requestAuthorization();
      return result;
    } catch (error) {
      console.error('Authorization failed:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  async requestNotificationPermissions() {
    try {
      await notifee.requestPermission();
      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Start a focus session
   * @param {Object} config - Session configuration
   * @param {string[]} config.blockedApps - Array of app bundle IDs to block
   * @param {number} config.durationMinutes - Session duration in minutes
   * @param {number} config.usageLimit - Usage limit in minutes for blocked apps
   * @param {string} config.sessionName - Name of the focus session
   */
  async startFocusSession(config) {
    const {
      blockedApps = ['com.zhiliaoapp.musically', 'com.burbn.instagram'],
      durationMinutes = 60,
      usageLimit = 15,
      sessionName = 'Focus Session',
    } = config;

    try {
      // Create notification channel
      await this.createNotificationChannel();

      // Show session start notification
      await this.showNotification({
        title: `${sessionName} Started`,
        body: `Stay focused for the next ${durationMinutes} minutes`,
        android: {
          channelId: 'focus-sessions',
          importance: 'high',
        },
      });

      // Start monitoring screen time
      if (Platform.OS === 'ios') {
        await ScreenTimeModule.startMonitoring(
          blockedApps,
          usageLimit
        );
      }

      // Store session data
      this.currentSession = {
        sessionName,
        startTime: Date.now(),
        endTime: Date.now() + durationMinutes * 60 * 1000,
        durationMinutes,
        usageLimit,
        blockedApps,
      };

      this.isMonitoring = true;

      // Schedule end notification
      await this.scheduleNotification({
        title: `${sessionName} Complete!`,
        body: 'Great job staying focused!',
        trigger: {
          type: TriggerType.TIMESTAMP,
          timestamp: this.currentSession.endTime,
        },
      });

      // Start periodic usage checks
      this.startUsageMonitoring(blockedApps, usageLimit);

      return {
        success: true,
        session: this.currentSession,
      };
    } catch (error) {
      console.error('Failed to start focus session:', error);
      throw error;
    }
  }

  /**
   * End the current focus session
   */
  async endFocusSession() {
    try {
      if (!this.currentSession) {
        return { success: false, message: 'No active session' };
      }

      // Stop monitoring
      if (Platform.OS === 'ios') {
        await ScreenTimeModule.stopMonitoring();
        await ScreenTimeModule.unblockApps();
      }

      // Clear usage monitoring interval
      if (this.usageCheckInterval) {
        clearInterval(this.usageCheckInterval);
        this.usageCheckInterval = null;
      }

      // Calculate session stats
      const sessionDuration = Date.now() - this.currentSession.startTime;
      const completedPercentage = Math.min(
        (sessionDuration / (this.currentSession.durationMinutes * 60 * 1000)) * 100,
        100
      );

      // Show completion notification
      await this.showNotification({
        title: 'Focus Session Ended',
        body: `You completed ${completedPercentage.toFixed(0)}% of your session`,
        android: {
          channelId: 'focus-sessions',
        },
      });

      const sessionSummary = {
        ...this.currentSession,
        endedAt: Date.now(),
        completedPercentage,
      };

      this.currentSession = null;
      this.isMonitoring = false;

      return {
        success: true,
        summary: sessionSummary,
      };
    } catch (error) {
      console.error('Failed to end focus session:', error);
      throw error;
    }
  }

  /**
   * Start monitoring usage during focus session
   */
  startUsageMonitoring(appBundleIds, limitMinutes) {
    // Check usage every 5 minutes
    this.usageCheckInterval = setInterval(async () => {
      try {
        if (Platform.OS === 'ios') {
          const now = Date.now();
          const sessionStart = this.currentSession?.startTime || now;

          const usageData = await ScreenTimeModule.getScreenUsage(
            appBundleIds,
            sessionStart,
            now
          );

          // Check if usage exceeds limit
          const totalMinutes = usageData.totalTime / 60;
          
          if (totalMinutes > limitMinutes) {
            await this.showUsageWarning(totalMinutes, limitMinutes);
          }
        }
      } catch (error) {
        console.error('Failed to check usage:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Show usage warning notification
   */
  async showUsageWarning(currentMinutes, limitMinutes) {
    await this.showNotification({
      title: '⚠️ Usage Limit Exceeded',
      body: `You've spent ${currentMinutes.toFixed(0)} minutes on restricted apps (limit: ${limitMinutes} min)`,
      android: {
        channelId: 'focus-warnings',
        importance: 'high',
        pressAction: {
          id: 'open-settings',
        },
      },
      ios: {
        sound: 'default',
        critical: true,
      },
    });

    // Also show an alert
    Alert.alert(
      'Focus Session Warning',
      `You've exceeded your ${limitMinutes}-minute limit on restricted apps. Would you like to review your Screen Time settings?`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  }

  /**
   * Schedule daily focus session reminder
   * @param {number} hour - Hour of day (0-23)
   * @param {number} minute - Minute of hour (0-59)
   */
  async scheduleDailyReminder(hour = 9, minute = 0) {
    try {
      await this.createNotificationChannel();

      // Cancel existing reminder
      await notifee.cancelTriggerNotification('daily-focus-reminder');

      // Create trigger for daily notification
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: this.getNextOccurrence(hour, minute),
        repeatFrequency: RepeatFrequency.DAILY,
      };

      await notifee.createTriggerNotification(
        {
          id: 'daily-focus-reminder',
          title: 'Time for Your Focus Session',
          body: 'Start a focus session to boost your productivity',
          android: {
            channelId: 'focus-reminders',
          },
          ios: {
            sound: 'default',
          },
        },
        trigger
      );

      return {
        success: true,
        nextReminder: new Date(trigger.timestamp),
      };
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
      throw error;
    }
  }

  /**
   * Get timestamp for next occurrence of specified time
   */
  getNextOccurrence(hour, minute) {
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hour, minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduled.getTime() <= now.getTime()) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.getTime();
  }

  /**
   * Create notification channel for Android
   */
  async createNotificationChannel() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'focus-sessions',
        name: 'Focus Sessions',
        importance: 4, // High importance
      });

      await notifee.createChannel({
        id: 'focus-warnings',
        name: 'Focus Warnings',
        importance: 4,
      });

      await notifee.createChannel({
        id: 'focus-reminders',
        name: 'Focus Reminders',
        importance: 3, // Default importance
      });
    }
  }

  /**
   * Show a notification
   */
  async showNotification(config) {
    try {
      await notifee.displayNotification(config);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Schedule a notification
   */
  async scheduleNotification(config) {
    try {
      await notifee.createTriggerNotification(
        {
          title: config.title,
          body: config.body,
          android: config.android || { channelId: 'focus-sessions' },
          ios: config.ios || {},
        },
        config.trigger
      );
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Check if a session is active
   */
  isSessionActive() {
    return this.isMonitoring && this.currentSession !== null;
  }
}

export default new FocusSessionManager();
