import { useNavigate } from 'react-router-dom'
import './PracticeHome.css'

// Mock classes with lecture counts
const PRACTICE_CLASSES = [
  {
    id: '1',
    name: 'Introduction to Computer Science',
    color: '#4F46E5',
    lectureCount: 8
  },
  {
    id: '2',
    name: 'Linear Algebra',
    color: '#10B981',
    lectureCount: 12
  },
  {
    id: '3',
    name: 'History of Art',
    color: '#F59E0B',
    lectureCount: 6
  },
  {
    id: '4',
    name: 'Organic Chemistry',
    color: '#EF4444',
    lectureCount: 10
  }
]

function PracticeHome() {
  const navigate = useNavigate()

  const handleClassClick = (classId, className) => {
    navigate(`/practice/${classId}/lectures?className=${encodeURIComponent(className)}`)
  }

  return (
    <div className="screen practice-home">
      <div className="practice-home__header">
        <h2 className="practice-home__title">Practice</h2>
        <p className="practice-home__subtitle">Test what you've learned</p>
      </div>

      <div className="practice-home__content">
        <div className="practice-home__grid">
          {PRACTICE_CLASSES.map(cls => (
            <ClassCard
              key={cls.id}
              id={cls.id}
              name={cls.name}
              color={cls.color}
              lectureCount={cls.lectureCount}
              onClick={() => handleClassClick(cls.id, cls.name)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ClassCard({ id, name, color, lectureCount, onClick }) {
  return (
    <button
      className="practice-home__class-card"
      onClick={onClick}
    >
      <div 
        className="practice-home__class-color" 
        style={{ backgroundColor: color }}
      ></div>
      <div className="practice-home__class-content">
        <h3 className="practice-home__class-name">{name}</h3>
        <p className="practice-home__class-lectures">{lectureCount} lectures available</p>
      </div>
    </button>
  )
}

export default PracticeHome
