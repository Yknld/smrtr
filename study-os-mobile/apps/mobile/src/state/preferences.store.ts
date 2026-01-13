import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCES_KEY = '@study_os_preferences';

export interface UserPreferences {
  contentLanguage: string;
  autoGenerateNotes: boolean;
  autoGenerateFlashcards: boolean;
  autoPlayPodcasts: boolean;
  dailyGoalEnabled: boolean;
  dailyGoalMinutes: number;
  playbackSpeed: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  contentLanguage: 'en',
  autoGenerateNotes: true,
  autoGenerateFlashcards: false,
  autoPlayPodcasts: true,
  dailyGoalEnabled: true,
  dailyGoalMinutes: 30,
  playbackSpeed: 1.0,
};

class PreferencesStore {
  private cache: UserPreferences | null = null;
  private listeners: Array<(prefs: UserPreferences) => void> = [];

  /**
   * Load preferences from AsyncStorage
   */
  async load(): Promise<UserPreferences> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        this.cache = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      } else {
        this.cache = { ...DEFAULT_PREFERENCES };
      }
      return this.cache;
    } catch (error) {
      console.error('[Preferences] Error loading:', error);
      this.cache = { ...DEFAULT_PREFERENCES };
      return this.cache;
    }
  }

  /**
   * Save preferences to AsyncStorage
   */
  async save(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.load();
      const updated = { ...current, ...preferences };
      
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      this.cache = updated;
      
      // Notify listeners
      this.listeners.forEach(listener => listener(updated));
    } catch (error) {
      console.error('[Preferences] Error saving:', error);
      throw error;
    }
  }

  /**
   * Get a specific preference value
   */
  async get<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K]> {
    const prefs = await this.load();
    return prefs[key];
  }

  /**
   * Set a specific preference value
   */
  async set<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    await this.save({ [key]: value } as Partial<UserPreferences>);
  }

  /**
   * Get cached preferences (returns immediately)
   */
  getCached(): UserPreferences {
    return this.cache || { ...DEFAULT_PREFERENCES };
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(listener: (prefs: UserPreferences) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear all preferences
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFERENCES_KEY);
      this.cache = { ...DEFAULT_PREFERENCES };
      this.listeners.forEach(listener => listener(this.cache!));
    } catch (error) {
      console.error('[Preferences] Error clearing:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const preferencesStore = new PreferencesStore();
