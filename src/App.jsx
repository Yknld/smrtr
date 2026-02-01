import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import PageTransition from './components/Layout/PageTransition'
import Landing from './screens/Landing'
import LoginSignup from './screens/LoginSignup'
import Home from './screens/Home'
import ClassNotes from './screens/ClassNotes'
import StudyHub from './screens/StudyHub'
import Translation from './screens/Translation'
import PracticeHome from './screens/PracticeHome'
import PracticeLectureSelection from './screens/PracticeLectureSelection'
import PracticeModeSelection from './screens/PracticeModeSelection'
import PracticeFlashcards from './screens/PracticeFlashcards'
import PracticeMultipleChoice from './screens/PracticeMultipleChoice'
import Podcast from './screens/Podcast'
import Settings from './screens/Settings'
import './App.css'

import './study-os/theme.css'
import './study-os/components/styles.css'
import AppShell from './study-os/AppShell'
import HomeScreen from './study-os/screens/HomeScreen'
import CourseDetailScreen from './study-os/screens/CourseDetailScreen'
import LessonHubScreen from './study-os/screens/LessonHubScreen'
import LiveScreen from './study-os/screens/LiveScreen'
import AITutorScreen from './study-os/screens/AITutorScreen'
import FlashcardsScreen from './study-os/screens/FlashcardsScreen'
import QuizScreen from './study-os/screens/QuizScreen'
import VideoPlayerScreen from './study-os/screens/VideoPlayerScreen'
import InteractiveSolverScreen from './study-os/screens/InteractiveSolverScreen'
import AssetsScreen from './study-os/screens/AssetsScreen'
import PodcastsScreen from './study-os/screens/PodcastsScreen'
import CoursePodcastsScreen from './study-os/screens/CoursePodcastsScreen'
import PodcastPlayerScreen from './study-os/screens/PodcastPlayerScreen'
import SettingsScreen from './study-os/screens/SettingsScreen'
import ProfileScreen from './study-os/screens/ProfileScreen'
import NotificationsScreen from './study-os/screens/NotificationsScreen'
import StudyPreferencesScreen from './study-os/screens/StudyPreferencesScreen'
import LanguageScreen from './study-os/screens/LanguageScreen'
import HelpSupportScreen from './study-os/screens/HelpSupportScreen'
import PrivacyPolicyScreen from './study-os/screens/PrivacyPolicyScreen'
import TermsOfServiceScreen from './study-os/screens/TermsOfServiceScreen'
import AnalyticsScreen from './study-os/screens/AnalyticsScreen'

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/home" element={<Navigate to="/app" replace />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<LoginSignup />} />
      <Route path="/legacy-home" element={
        <Layout>
          <PageTransition>
            <Home />
          </PageTransition>
        </Layout>
      } />
      <Route path="/classes/:classId" element={
        <Layout>
          <PageTransition>
            <ClassNotes />
          </PageTransition>
        </Layout>
      } />
      <Route path="/classes/:classId/notes/:noteId" element={
        <Layout>
          <PageTransition>
            <StudyHub />
          </PageTransition>
        </Layout>
      } />
      <Route path="/classes/:classId/notes/:noteId/translate" element={
        <Layout>
          <PageTransition>
            <Translation />
          </PageTransition>
        </Layout>
      } />
      <Route path="/practice" element={
        <Layout>
          <PageTransition>
            <PracticeHome />
          </PageTransition>
        </Layout>
      } />
      <Route path="/practice/:classId/lectures" element={
        <Layout>
          <PageTransition>
            <PracticeLectureSelection />
          </PageTransition>
        </Layout>
      } />
      <Route path="/practice/:classId/mode" element={
        <Layout>
          <PageTransition>
            <PracticeModeSelection />
          </PageTransition>
        </Layout>
      } />
      <Route path="/practice/:classId/flashcards" element={
        <Layout>
          <PageTransition>
            <PracticeFlashcards />
          </PageTransition>
        </Layout>
      } />
      <Route path="/practice/:classId/multiple-choice" element={
        <Layout>
          <PageTransition>
            <PracticeMultipleChoice />
          </PageTransition>
        </Layout>
      } />
          <Route path="/podcast" element={
            <Layout>
              <PageTransition>
                <Podcast />
              </PageTransition>
            </Layout>
          } />
          <Route path="/settings" element={
            <Layout>
              <PageTransition>
                <Settings />
              </PageTransition>
            </Layout>
          } />

      {/* Study OS (iOS app as web) */}
      <Route path="/app" element={<AppShell />}>
        <Route index element={<HomeScreen />} />
        <Route path="course/:courseId" element={<CourseDetailScreen />} />
        <Route path="lesson/:lessonId" element={<LessonHubScreen />} />
        <Route path="lesson/:lessonId/live" element={<LiveScreen />} />
        <Route path="lesson/:lessonId/tutor" element={<AITutorScreen />} />
        <Route path="lesson/:lessonId/flashcards" element={<FlashcardsScreen />} />
        <Route path="lesson/:lessonId/quiz" element={<QuizScreen />} />
        <Route path="lesson/:lessonId/video" element={<VideoPlayerScreen />} />
        <Route path="lesson/:lessonId/solver" element={<InteractiveSolverScreen />} />
        <Route path="lesson/:lessonId/assets" element={<AssetsScreen />} />
        <Route path="podcasts" element={<PodcastsScreen />} />
        <Route path="podcasts/course/:courseId" element={<CoursePodcastsScreen />} />
        <Route path="podcasts/play/:lessonId" element={<PodcastPlayerScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="settings/profile" element={<ProfileScreen />} />
        <Route path="settings/notifications" element={<NotificationsScreen />} />
        <Route path="settings/study-preferences" element={<StudyPreferencesScreen />} />
        <Route path="settings/language" element={<LanguageScreen />} />
        <Route path="settings/help" element={<HelpSupportScreen />} />
        <Route path="settings/privacy" element={<PrivacyPolicyScreen />} />
        <Route path="settings/terms" element={<TermsOfServiceScreen />} />
        <Route path="settings/analytics" element={<AnalyticsScreen />} />
      </Route>
        </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
