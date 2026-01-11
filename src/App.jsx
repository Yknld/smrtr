import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginSignup />} />
      <Route path="/home" element={
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
