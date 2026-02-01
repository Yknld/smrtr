/**
 * Matches study-os-mobile HomeScreen.tsx – uses Supabase for signed-in user (same data as phone).
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCourses, createCourse } from '../data/courses.repository'
import { getCourses } from '../data/mock'
import SearchBar from '../components/SearchBar'
import CourseCard from '../components/CourseCard'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import FAB from '../components/FAB'
import CreateCourseModal from '../components/CreateCourseModal'
import { Icon } from '../components/Icons'
import './screens.css'

function searchCourses(courses, query) {
  if (!query.trim()) return courses
  const q = query.trim().toLowerCase()
  return courses.filter((c) => c.title.toLowerCase().includes(q))
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)

  const currentCourses = filteredCourses.filter((c) => !c.isCompleted)
  const completedCourses = filteredCourses.filter((c) => c.isCompleted)

  const loadCourses = useCallback(async () => {
    try {
      const data = await fetchCourses()
      setCourses(data)
      setFilteredCourses(searchCourses(data, searchQuery))
    } catch (e) {
      console.error('Backend load failed, using mock:', e?.message)
      const data = await getCourses()
      setCourses(data)
      setFilteredCourses(searchCourses(data, searchQuery))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    setFilteredCourses(searchCourses(courses, searchQuery))
  }, [searchQuery, courses])

  const handleSearch = (query) => {
    setSearchQuery(query)
    setFilteredCourses(searchCourses(courses, query))
  }

  const handleCloseSearch = () => {
    setSearchExpanded(false)
    setSearchQuery('')
    setFilteredCourses(courses)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadCourses()
  }

  const handleCoursePress = (course) => {
    navigate(`/app/course/${course.id}`, { state: { courseTitle: course.title } })
  }

  const handleCreateCourse = async (title, color) => {
    try {
      const created = await createCourse({ title, color })
      setCreateModalVisible(false)
      await loadCourses()
      navigate(`/app/course/${created.id}`, { state: { courseTitle: created.title } })
    } catch (e) {
      console.error('Failed to create course:', e?.message)
    }
  }

  return (
    <div className="so-screen">
      <header className="so-home-header">
        <span className="so-home-header-spacer" />
        <div className="so-home-header-actions">
          <button
            type="button"
            className="so-home-header-btn"
            onClick={() => navigate('/app/settings/analytics')}
            aria-label="Profile and progress"
            title="View your progress and analytics"
          >
            <Icon name="person" size={22} />
          </button>
          <button
            type="button"
            className="so-home-header-btn"
            onClick={() => navigate('/app/settings')}
            aria-label="Settings"
            title="Settings"
          >
            <Icon name="settings" size={22} />
          </button>
        </div>
      </header>
      <div className="so-screen-inner">
        {/* Search – same structure as iOS */}
        <div className="so-home-search">
          {searchExpanded ? (
            <div className="so-home-search-row">
              <SearchBar
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search courses..."
              />
              <button
                type="button"
                className="so-home-close-btn"
                onClick={handleCloseSearch}
                aria-label="Close search"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="so-home-search-icon-btn"
              onClick={() => setSearchExpanded(true)}
              aria-label="Search"
            >
              ⌕
            </button>
          )}
        </div>

        {loading ? (
          <div className="so-home-loading-wrap">
            <LoadingState count={5} />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="so-home-empty-wrap">
          <EmptyState
            title={
              searchQuery
                ? 'No courses found'
                : courses.length === 0
                  ? 'Create your first course'
                  : 'No courses match your search'
            }
            subtitle={
              searchQuery
                ? 'Try a different search term'
                : courses.length === 0
                  ? 'Get started by creating a course or importing content'
                  : undefined
            }
            actionLabel={courses.length === 0 ? 'Create Course' : undefined}
            onAction={courses.length === 0 ? () => setCreateModalVisible(true) : undefined}
          />
          </div>
        ) : (
          <div className="so-home-course-list" role="region" aria-label="Course list">
            {refreshing && <div className="so-refresh-bar">Refreshing...</div>}
            <div className="so-home-course-list-content">
              {currentCourses.length > 0 && (
                <>
                  <h2 className="so-section-title">Current</h2>
                  {currentCourses.map((course) => (
                    <CourseCard key={course.id} course={course} onPress={handleCoursePress} />
                  ))}
                </>
              )}
              {completedCourses.length > 0 && (
                <>
                  <h2 className="so-section-title">Completed</h2>
                  {completedCourses.map((course) => (
                    <CourseCard key={course.id} course={course} onPress={handleCoursePress} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <FAB onPress={() => setCreateModalVisible(true)} />
        <CreateCourseModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onCreate={handleCreateCourse}
        />
      </div>
    </div>
  )
}
