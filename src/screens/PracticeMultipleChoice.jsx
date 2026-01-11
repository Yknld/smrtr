import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { PRACTICE_QUESTIONS } from '../data/practiceQuestions'
import { getClassColor } from '../data/classColors'
import './PracticeMultipleChoice.css'

function PracticeMultipleChoice() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const className = searchParams.get('className') || 'Class'
  const bloomColor = getClassColor(classId)

  const questions = PRACTICE_QUESTIONS.multipleChoice
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [answers, setAnswers] = useState([]) // Track all answers
  const [showResults, setShowResults] = useState(false)

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const isCorrect = selectedIndex !== null && selectedIndex === currentQuestion.correctIndex

  const handleAnswerSelect = (index) => {
    if (isLocked) return // Prevent changing answer after selection
    setSelectedIndex(index)
    setIsLocked(true) // Lock immediately on click (Kahoot-like)
  }

  const handleNext = () => {
    // Save the answer for current question
    const wasCorrect = selectedIndex === currentQuestion.correctIndex
    const newAnswers = [...answers, { questionIndex: currentIndex, selectedIndex, correct: wasCorrect }]
    setAnswers(newAnswers)

    if (isLastQuestion) {
      // Show results screen
      setShowResults(true)
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelectedIndex(null)
      setIsLocked(false)
    }
  }

  const handleBackToPractice = () => {
    navigate('/practice')
  }

  const handleBack = () => {
    navigate(-1)
  }

  // Calculate results
  const correctCount = answers.filter(a => a.correct).length
  const totalQuestions = questions.length
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  // Show results screen
  if (showResults) {
    return (
      <div 
        className="screen practice-multiple-choice practice-multiple-choice--results"
        style={{ '--bloom-color': bloomColor }}
      >
        <div className="practice-multiple-choice__results">
          <div className="practice-multiple-choice__results-header">
            <h2 className="practice-multiple-choice__results-title">Quiz Complete!</h2>
            <div className="practice-multiple-choice__results-score">
              <div className="practice-multiple-choice__results-score-number">
                {correctCount} / {totalQuestions}
              </div>
              <div className="practice-multiple-choice__results-score-percentage">
                {percentage}%
              </div>
            </div>
          </div>

          <div className="practice-multiple-choice__results-breakdown">
            <div className="practice-multiple-choice__results-stat">
              <span className="practice-multiple-choice__results-stat-label">Correct</span>
              <span className="practice-multiple-choice__results-stat-value practice-multiple-choice__results-stat-value--correct">
                {correctCount}
              </span>
            </div>
            <div className="practice-multiple-choice__results-stat">
              <span className="practice-multiple-choice__results-stat-label">Incorrect</span>
              <span className="practice-multiple-choice__results-stat-value practice-multiple-choice__results-stat-value--incorrect">
                {totalQuestions - correctCount}
              </span>
            </div>
          </div>

          <div className="practice-multiple-choice__results-actions">
            <button
              className="practice-multiple-choice__results-button"
              onClick={handleBackToPractice}
            >
              Back to Practice
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="screen practice-multiple-choice"
      style={{ '--bloom-color': bloomColor }}
    >
      <div className="practice-multiple-choice__header">
        <button
          className="practice-multiple-choice__back-button"
          onClick={handleBack}
        >
          ← Back
        </button>
        <div className="practice-multiple-choice__progress">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      <div className="practice-multiple-choice__content">
        <div className="practice-multiple-choice__question">
          <h3 className="practice-multiple-choice__question-text">
            {currentQuestion.question}
          </h3>

          <div className="practice-multiple-choice__options">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedIndex === index
              const isCorrectAnswer = index === currentQuestion.correctIndex
              const showResult = isLocked
              const showAsCorrect = showResult && isCorrectAnswer
              const showAsIncorrect = showResult && isSelected && !isCorrectAnswer
              const showAsFaded = showResult && !isSelected && !isCorrectAnswer

              return (
                <button
                  key={index}
                  className={`practice-multiple-choice__option ${
                    showAsCorrect ? 'practice-multiple-choice__option--correct' : ''
                  } ${
                    showAsIncorrect ? 'practice-multiple-choice__option--incorrect' : ''
                  } ${
                    showAsFaded ? 'practice-multiple-choice__option--faded' : ''
                  } ${
                    isSelected && !showResult ? 'practice-multiple-choice__option--selected' : ''
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isLocked}
                >
                  <span className="practice-multiple-choice__option-text">{option}</span>
                  {showAsCorrect && (
                    <span className="practice-multiple-choice__option-icon practice-multiple-choice__option-icon--check">✓</span>
                  )}
                  {showAsIncorrect && (
                    <span className="practice-multiple-choice__option-icon practice-multiple-choice__option-icon--cross">✗</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="practice-multiple-choice__footer">
        {isLocked && (
          <button
            className="practice-multiple-choice__next-button"
            onClick={handleNext}
          >
            {isLastQuestion ? 'Finish' : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}

export default PracticeMultipleChoice
