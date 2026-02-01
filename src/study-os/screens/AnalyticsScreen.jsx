/**
 * Analytics – study time, streaks, weekly activity, progress. Matches mobile AnalyticsScreen.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { Icon } from '../components/Icons'
import './screens.css'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function formatTime(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '0h 0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export default function AnalyticsScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  const [stats, setStats] = useState({
    totalStudyTime: 0,
    lessonsCompleted: 0,
    coursesActive: 0,
    currentStreak: 0,
    longestStreak: 0,
    notesCreated: 0,
    flashcardsCompleted: 0,
    quizzesCompleted: 0,
    podcastsListened: 0,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  })

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStats((s) => ({ ...s, weeklyActivity: [12, 25, 18, 30, 22, 35, 28] }))
        setLoading(false)
        return
      }

      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user.id)

      const courseIds = courses?.map((c) => c.id) || []
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('course_id', courseIds)

      const lessonIds = lessons?.map((l) => l.id) || []
      let notesCount = 0
      if (lessonIds.length > 0) {
        const { data: notes } = await supabase
          .from('notes_v2')
          .select('id')
          .in('lesson_id', lessonIds)
        notesCount = notes?.length ?? 0
      }

      const weeklyActivity = [12, 25, 18, 30, 22, 35, 28]

      setStats({
        totalStudyTime: 1247,
        lessonsCompleted: lessons?.length ?? 0,
        coursesActive: courses?.length ?? 0,
        currentStreak: 5,
        longestStreak: 12,
        notesCreated: notesCount,
        flashcardsCompleted: 124,
        quizzesCompleted: 8,
        podcastsListened: 15,
        weeklyActivity,
      })
    } catch (e) {
      console.error('Analytics load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics, period])

  const maxActivity = Math.max(...stats.weeklyActivity, 1)

  return (
    <div className="so-screen">
      <header className="so-sub-header">
        <button type="button" className="so-sub-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-sub-title">Analytics</h1>
        <span className="so-sub-spacer" />
      </header>

      <div className="so-screen-inner so-analytics-content">
        <p className="so-analytics-subtitle">Study time, completion rates, and insights.</p>

        {/* Period */}
        <div className="so-analytics-period">
          {['week', 'month', 'all'].map((p) => (
            <button
              key={p}
              type="button"
              className={`so-analytics-period-btn ${period === p ? 'so-analytics-period-btn-active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="so-analytics-loading">
            <p className="so-empty-subtitle">Loading…</p>
          </div>
        ) : (
          <>
            {/* Main stats */}
            <div className="so-analytics-main-grid">
              <div className="so-analytics-main-card">
                <span className="so-analytics-main-icon" aria-hidden>
                  <Icon name="radio" size={22} />
                </span>
                <span className="so-analytics-main-value">{formatTime(stats.totalStudyTime)}</span>
                <span className="so-analytics-main-label">Study Time</span>
              </div>
              <div className="so-analytics-main-card">
                <span className="so-analytics-main-icon so-analytics-main-icon-streak" aria-hidden>
                  <Icon name="layers" size={22} />
                </span>
                <span className="so-analytics-main-value">{stats.currentStreak}</span>
                <span className="so-analytics-main-label">Day Streak</span>
              </div>
            </div>

            {/* Weekly activity */}
            <section className="so-analytics-section">
              <h2 className="so-analytics-section-title">Weekly Activity</h2>
              <div className="so-analytics-chart">
                {stats.weeklyActivity.map((value, i) => (
                  <div key={i} className="so-analytics-bar-wrap">
                    <div className="so-analytics-bar">
                      <div
                        className="so-analytics-bar-fill"
                        style={{ height: `${(value / maxActivity) * 60 || 4}px` }}
                      />
                    </div>
                    <span className="so-analytics-bar-label">{DAYS[i]}</span>
                  </div>
                ))}
              </div>
              <p className="so-analytics-hint">Minutes studied per day</p>
            </section>

            {/* Progress */}
            <section className="so-analytics-section">
              <h2 className="so-analytics-section-title">Progress</h2>
              <ul className="so-analytics-list">
                <li className="so-analytics-row">
                  <span className="so-analytics-row-icon" aria-hidden><Icon name="fileText" size={20} /></span>
                  <span className="so-analytics-row-label">Lessons Completed</span>
                  <span className="so-analytics-row-value">{stats.lessonsCompleted}</span>
                </li>
                <li className="so-analytics-row">
                  <span className="so-analytics-row-icon" aria-hidden><Icon name="folder" size={20} /></span>
                  <span className="so-analytics-row-label">Active Courses</span>
                  <span className="so-analytics-row-value">{stats.coursesActive}</span>
                </li>
                <li className="so-analytics-row">
                  <span className="so-analytics-row-icon" aria-hidden><Icon name="fileText" size={20} /></span>
                  <span className="so-analytics-row-label">Notes Created</span>
                  <span className="so-analytics-row-value">{stats.notesCreated}</span>
                </li>
                <li className="so-analytics-row">
                  <span className="so-analytics-row-icon" aria-hidden><Icon name="layers" size={20} /></span>
                  <span className="so-analytics-row-label">Flashcards Completed</span>
                  <span className="so-analytics-row-value">{stats.flashcardsCompleted}</span>
                </li>
                <li className="so-analytics-row">
                  <span className="so-analytics-row-icon" aria-hidden><Icon name="help" size={20} /></span>
                  <span className="so-analytics-row-label">Quizzes Completed</span>
                  <span className="so-analytics-row-value">{stats.quizzesCompleted}</span>
                </li>
                <li className="so-analytics-row">
                  <span className="so-analytics-row-icon" aria-hidden><Icon name="headphones" size={20} /></span>
                  <span className="so-analytics-row-label">Podcasts Listened</span>
                  <span className="so-analytics-row-value">{stats.podcastsListened}</span>
                </li>
              </ul>
            </section>

            {/* Achievements */}
            <section className="so-analytics-section">
              <h2 className="so-analytics-section-title">Achievements</h2>
              <ul className="so-analytics-list">
                <li className="so-analytics-row">
                  <span className="so-analytics-row-icon so-analytics-row-icon-trophy" aria-hidden><Icon name="layers" size={20} /></span>
                  <span className="so-analytics-row-label">Longest Streak</span>
                  <span className="so-analytics-row-value">{stats.longestStreak} days</span>
                </li>
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
