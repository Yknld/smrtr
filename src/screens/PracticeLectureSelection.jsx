import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import './PracticeLectureSelection.css'

// Mock lectures for each class
const MOCK_LECTURES = {
  '1': [
    { id: 'l1', title: 'Introduction to Algorithms' },
    { id: 'l2', title: 'Data Structures Overview' },
    { id: 'l3', title: 'Sorting Algorithms' },
    { id: 'l4', title: 'Search Algorithms' }
  ],
  '2': [
    { id: 'l1', title: 'Vector Spaces' },
    { id: 'l2', title: 'Linear Transformations' },
    { id: 'l3', title: 'Matrix Operations' }
  ],
  '3': [
    { id: 'l1', title: 'Renaissance Art Movements' },
    { id: 'l2', title: 'Impressionist Techniques' }
  ],
  '4': [
    { id: 'l1', title: 'Organic Reactions Overview' },
    { id: 'l2', title: 'Benzene Structure and Reactions' },
    { id: 'l3', title: 'Functional Groups' }
  ]
}

function PracticeLectureSelection() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const className = searchParams.get('className') || 'Class'
  
  const lectures = MOCK_LECTURES[classId] || []
  const [selectedLectures, setSelectedLectures] = useState(new Set())

  const handleToggleLecture = (lectureId) => {
    setSelectedLectures(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lectureId)) {
        newSet.delete(lectureId)
      } else {
        newSet.add(lectureId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    setSelectedLectures(new Set(lectures.map(l => l.id)))
  }

  const handleClearAll = () => {
    setSelectedLectures(new Set())
  }

  const handleContinue = () => {
    if (selectedLectures.size > 0) {
      const selectedIds = Array.from(selectedLectures).join(',')
      navigate(`/practice/${classId}/mode?className=${encodeURIComponent(className)}&lectures=${selectedIds}`)
    }
  }

  const allSelected = lectures.length > 0 && selectedLectures.size === lectures.length
  const noneSelected = selectedLectures.size === 0

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="screen practice-lecture-selection">
      <div className="practice-lecture-selection__header">
        <button
          className="practice-lecture-selection__back-button"
          onClick={handleBack}
        >
          ← Back
        </button>
        <div className="practice-lecture-selection__header-content">
          <h2 className="practice-lecture-selection__title">
            Practice · {className}
          </h2>
          <p className="practice-lecture-selection__instruction">
            Select lectures to include
          </p>
        </div>
      </div>

      <div className="practice-lecture-selection__content">
        <div className="practice-lecture-selection__controls">
          <button
            className="practice-lecture-selection__control-button"
            onClick={handleSelectAll}
            disabled={allSelected}
          >
            Select all
          </button>
          <button
            className="practice-lecture-selection__control-button"
            onClick={handleClearAll}
            disabled={noneSelected}
          >
            Clear all
          </button>
        </div>

        <div className="practice-lecture-selection__list">
          {lectures.map(lecture => (
            <LectureCheckbox
              key={lecture.id}
              id={lecture.id}
              title={lecture.title}
              checked={selectedLectures.has(lecture.id)}
              onChange={() => handleToggleLecture(lecture.id)}
            />
          ))}
        </div>
      </div>

      <div className="practice-lecture-selection__footer">
        <button
          className="practice-lecture-selection__continue-button"
          onClick={handleContinue}
          disabled={selectedLectures.size === 0}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function LectureCheckbox({ id, title, checked, onChange }) {
  return (
    <label className="practice-lecture-selection__checkbox-item">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="practice-lecture-selection__checkbox-input"
      />
      <span className="practice-lecture-selection__checkbox-custom"></span>
      <span className="practice-lecture-selection__checkbox-label">{title}</span>
    </label>
  )
}

export default PracticeLectureSelection
