/**
 * Navigation Type Definitions
 */

export type RootStackParamList = {
  Home: undefined;
  Podcasts: undefined;
  Settings: undefined;
};

export type PodcastsStackParamList = {
  PodcastsMain: undefined;
  CoursePodcasts: {
    courseId: string;
    courseTitle: string;
  };
  PodcastPlayer: {
    lessonId: string;
    lessonTitle: string;
    podcastUrl?: string;
    podcastAvailable?: boolean;
  };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  CourseDetail: {
    courseId: string;
    courseTitle: string;
  };
  LessonHub: {
    lessonId: string;
    lessonTitle: string;
  };
  InteractiveSolver: {
    lessonId: string;
    lessonTitle: string;
  };
  Flashcards: {
    lessonId: string;
    lessonTitle: string;
  };
  PodcastPlayer: {
    lessonId: string;
    lessonTitle: string;
    podcastUrl?: string;
    podcastAvailable?: boolean;
  };
  AllSchedules: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  Notifications: undefined;
  StudyPreferences: undefined;
  Language: undefined;
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Analytics: undefined;
};
