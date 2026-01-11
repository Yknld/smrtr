import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { PRACTICE_QUESTIONS } from '../data/practiceQuestions'
import './PracticeFlashcards.css'

function PracticeFlashcards() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const className = searchParams.get('className') || 'Class'

  const flashcards = PRACTICE_QUESTIONS.flashcards
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const currentCard = flashcards[currentIndex]
  const isLastCard = currentIndex === flashcards.length - 1

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = () => {
    if (isLastCard) {
      // Return to practice home when done
      navigate('/practice')
    } else {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="screen practice-flashcards">
      <div className="practice-flashcards__header">
        <button
          className="practice-flashcards__back-button"
          onClick={handleBack}
        >
          ← Back
        </button>
        <div className="practice-flashcards__progress">
          {currentIndex + 1} / {flashcards.length}
        </div>
      </div>

      <div className="practice-flashcards__content">
        <div
          className={`practice-flashcards__card ${isFlipped ? 'practice-flashcards__card--flipped' : ''}`}
          onClick={handleFlip}
        >
          <div className="practice-flashcards__card-face practice-flashcards__card-front">
            <div className="practice-flashcards__card-label">Question</div>
            <div className="practice-flashcards__card-text">{currentCard.front}</div>
            <div className="practice-flashcards__card-hint">Click to flip</div>
          </div>
          <div className="practice-flashcards__card-face practice-flashcards__card-back">
            <div className="practice-flashcards__card-label">Answer</div>
            <div className="practice-flashcards__card-text">{currentCard.back}</div>
            <div className="practice-flashcards__card-hint">Click to flip</div>
          </div>
        </div>
      </div>

      <div className="practice-flashcards__footer">
        <button
          className="practice-flashcards__next-button"
          onClick={handleNext}
        >
          {isLastCard ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}

export default PracticeFlashcards
