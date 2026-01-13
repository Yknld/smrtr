import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getClassColor } from '../data/classColors'
import './PracticeModeSelection.css'

const PRACTICE_MODES = [
  {
    id: 'flashcards',
    title: 'Flashcards',
    icon: '🎴',
    description: 'Study key terms and concepts with interactive flashcards'
  },
  {
    id: 'multiple-choice',
    title: 'Multiple Choice',
    icon: '✓',
    description: 'Test your knowledge with multiple choice questions'
  }
]

function PracticeModeSelection() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const className = searchParams.get('className') || 'Class'
  const lectures = searchParams.get('lectures') || ''
  const bloomColor = getClassColor(classId)

  const handleModeSelect = (modeId) => {
    navigate(`/practice/${classId}/${modeId}?className=${encodeURIComponent(className)}&lectures=${lectures}`)
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div 
      className="screen practice-mode-selection"
      style={{ '--bloom-color': bloomColor }}
    >
      <div className="practice-mode-selection__header">
        <button
          className="practice-mode-selection__back-button"
          onClick={handleBack}
        >
          ← Back
        </button>
        <h2 className="practice-mode-selection__title">Choose a practice mode</h2>
      </div>

      <div className="practice-mode-selection__content">
        <div className="practice-mode-selection__grid">
          {PRACTICE_MODES.map(mode => (
            <ModeCard
              key={mode.id}
              id={mode.id}
              title={mode.title}
              icon={mode.icon}
              description={mode.description}
              onClick={() => handleModeSelect(mode.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ModeCard({ id, title, icon, description, onClick }) {
  return (
    <button
      className="practice-mode-selection__mode-card"
      onClick={onClick}
    >
      <div className="practice-mode-selection__mode-icon">{icon}</div>
      <h3 className="practice-mode-selection__mode-title">{title}</h3>
      <p className="practice-mode-selection__mode-description">{description}</p>
    </button>
  )
}

export default PracticeModeSelection
