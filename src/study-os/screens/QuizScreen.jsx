/**
 * Quiz – questions, options, next/submit, results. Data from lessonOutputs.repository.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { fetchQuiz, generateQuiz } from '../data/lessonOutputs.repository'
import { getQuizQuestions } from '../data/mock'
import './screens.css'

function loadQuiz(lessonId) {
  return fetchQuiz(lessonId).catch(() => getQuizQuestions(lessonId))
}

export default function QuizScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Quiz'

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [finished, setFinished] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const refresh = useCallback(() => {
    if (!lessonId) return
    setLoading(true)
    setError(null)
    loadQuiz(lessonId)
      .then((data) => {
        setQuestions(Array.isArray(data) ? data : [])
        setIndex(0)
        setSelected(null)
        setAnswers([])
        setFinished(false)
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load')
        setQuestions([])
      })
      .finally(() => setLoading(false))
  }, [lessonId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleGenerate = () => {
    if (!lessonId || generating) return
    setGenerating(true)
    setError(null)
    generateQuiz(lessonId)
      .then(() => refresh())
      .catch((e) => setError(e?.message || 'Generate failed'))
      .finally(() => setGenerating(false))
  }

  const question = questions[index]
  const isLast = index === questions.length - 1

  const handleNext = () => {
    if (showFeedback) {
      setShowFeedback(false)
      if (isLast) {
        setFinished(true)
      } else {
        setIndex((i) => i + 1)
        setSelected(null)
      }
      return
    }
    if (selected != null) {
      setAnswers((a) => [...a, selected])
      setShowFeedback(true)
    }
  }

  const handleDone = () => {
    navigate(-1)
  }

  const correctCount = answers.filter((ans, i) => questions[i] && ans === questions[i].correctIndex).length

  if (loading) {
    return (
      <div className="so-screen">
        <header className="so-simple-header">
          <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <h1 className="so-simple-title">{lessonTitle}</h1>
          <span className="so-simple-spacer" />
        </header>
        <div className="so-simple-content">
          <p className="so-empty-subtitle">Loading…</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="so-screen">
        <header className="so-simple-header">
          <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <h1 className="so-simple-title">{lessonTitle}</h1>
          <span className="so-simple-spacer" />
        </header>
        <div className="so-simple-content so-empty">
          <p className="so-empty-title">No quiz yet</p>
          <p className="so-empty-subtitle">Generate a quiz from this lesson to test yourself.</p>
          {error && <p className="so-empty-subtitle" style={{ color: 'var(--so-error)' }}>{error}</p>}
          <button
            type="button"
            className="so-quiz-next-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate quiz'}
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="so-screen">
        <header className="so-simple-header">
          <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <h1 className="so-simple-title">{lessonTitle}</h1>
          <span className="so-simple-spacer" />
        </header>
        <div className="so-simple-content">
          <div className="so-quiz-results">
            <h2 className="so-quiz-results-title">Quiz complete</h2>
            <p className="so-quiz-results-score">
              You got {correctCount} out of {questions.length} correct.
            </p>
            <ul className="so-quiz-review" aria-label="Review">
              {questions.map((q, i) => {
                const userChoice = answers[i]
                const correct = userChoice === q.correctIndex
                return (
                  <li key={i} className={`so-quiz-review-item ${correct ? 'so-quiz-review-item--correct' : 'so-quiz-review-item--wrong'}`}>
                    <span className="so-quiz-review-q">Q{i + 1}</span>
                    <span className="so-quiz-review-status">{correct ? 'Correct' : 'Wrong'}</span>
                    {!correct && (
                      <span className="so-quiz-review-answer">Correct: {q.options[q.correctIndex]}</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <button type="button" className="so-quiz-results-btn" onClick={handleDone}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="so-screen">
      <header className="so-simple-header">
        <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-simple-title">{lessonTitle}</h1>
        <span className="so-simple-spacer" />
      </header>
      <div className="so-simple-content">
        <div className="so-quiz-content">
          <p className="so-quiz-progress">
            Question {index + 1} of {questions.length}
          </p>
          <h2 className="so-quiz-stem">{question.stem}</h2>
          <div className="so-quiz-options" role="radiogroup" aria-label="Choose an answer">
            {question.options.map((opt, i) => {
              const isCorrect = i === question.correctIndex
              const isWrong = showFeedback && selected === i && selected !== question.correctIndex
              const showAsCorrect = showFeedback && isCorrect
              const showAsIncorrect = showFeedback && isWrong
              return (
                <button
                  key={i}
                  type="button"
                  className={`so-quiz-option ${selected === i ? 'selected' : ''} ${showAsCorrect ? 'so-quiz-option--correct' : ''} ${showAsIncorrect ? 'so-quiz-option--incorrect' : ''}`}
                  onClick={() => !showFeedback && setSelected(i)}
                  role="radio"
                  aria-checked={selected === i}
                  disabled={showFeedback}
                  aria-describedby={showFeedback && isCorrect ? 'quiz-correct-answer' : undefined}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {showFeedback && (
            <p id="quiz-correct-answer" className="so-quiz-feedback" aria-live="polite">
              {selected === question.correctIndex
                ? 'Correct.'
                : `Correct answer: ${question.options[question.correctIndex]}`}
            </p>
          )}
          <div className="so-quiz-actions">
            <button
              type="button"
              className="so-quiz-next-btn"
              onClick={handleNext}
              disabled={!showFeedback && selected == null}
            >
              {showFeedback ? (isLast ? 'See results' : 'Next') : isLast ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
