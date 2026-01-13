import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { CourseDetailScreen } from '../screens/CourseDetail/CourseDetailScreen';
import { LessonHubScreen } from '../screens/LessonHub/LessonHubScreen';
import { LessonWorkspaceScreen } from '../screens/LessonWorkspace/LessonWorkspaceScreen';
import { AssetsScreen } from '../screens/Assets/AssetsScreen';
import { AITutorScreen } from '../screens/AITutor/AITutorScreen';
import { FlashcardsScreen } from '../screens/Flashcards/FlashcardsScreen';
import { QuizScreen } from '../screens/Quiz/QuizScreen';
import { PodcastsScreen } from '../screens/Podcasts/PodcastsScreen';
import { CoursePodcastsScreen } from '../screens/Podcasts/CoursePodcastsScreen';
import { PodcastPlayerScreen } from '../screens/Podcasts/PodcastPlayerScreen';
import { NotesViewScreen } from '../screens/Notes/NotesViewScreen';
import { AllSchedulesScreen } from '../screens/AllSchedules/AllSchedulesScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { ProfileScreen } from '../screens/Settings/ProfileScreen';
import { NotificationsScreen } from '../screens/Settings/NotificationsScreen';
import { StudyPreferencesScreen } from '../screens/Settings/StudyPreferencesScreen';
import { LanguageScreen } from '../screens/Settings/LanguageScreen';
import { HelpSupportScreen } from '../screens/Settings/HelpSupportScreen';
import { PrivacyPolicyScreen } from '../screens/Settings/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/Settings/TermsOfServiceScreen';
import { AnalyticsScreen } from '../screens/Settings/AnalyticsScreen';
import { colors } from '../ui/tokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="LessonHub" component={LessonHubScreen} />
      <Stack.Screen name="LessonWorkspace" component={LessonWorkspaceScreen} />
      <Stack.Screen name="Assets" component={AssetsScreen} />
      <Stack.Screen name="AITutor" component={AITutorScreen} />
      <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="PodcastPlayer" component={PodcastPlayerScreen} />
      <Stack.Screen name="NotesView" component={NotesViewScreen} />
      <Stack.Screen name="AllSchedules" component={AllSchedulesScreen} />
    </Stack.Navigator>
  );
};

const PodcastsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PodcastsMain" component={PodcastsScreen} />
      <Stack.Screen name="CoursePodcasts" component={CoursePodcastsScreen} />
      <Stack.Screen name="PodcastPlayer" component={PodcastPlayerScreen} />
    </Stack.Navigator>
  );
};

const SettingsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="StudyPreferences" component={StudyPreferencesScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopWidth: 0,
            height: 80,
            paddingBottom: 20,
            paddingTop: 20,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <Tab.Screen
          name="Podcasts"
          component={PodcastsStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="headset" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
