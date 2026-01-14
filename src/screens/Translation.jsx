import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getClassColor } from '../data/classColors'
import './Translation.css'

const TARGET_LANGUAGES = [
  { id: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { id: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { id: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { id: 'zh', name: 'Mandarin', nativeName: '中文', flag: '🇨🇳' }
]

const DEMO_TRANSLATIONS = {
  es: {
    title: 'Introducción a los Algoritmos',
    preview: 'Este curso cubre los conceptos fundamentales de algoritmos y estructuras de datos. Aprenderás sobre complejidad temporal, algoritmos de ordenamiento, y técnicas avanzadas de resolución de problemas.'
  },
  fr: {
    title: 'Introduction aux Algorithmes',
    preview: 'Ce cours couvre les concepts fondamentaux des algorithmes et structures de données. Vous apprendrez la complexité temporelle, les algorithmes de tri et les techniques avancées de résolution de problèmes.'
  },
  ar: {
    title: 'مقدمة في الخوارزميات',
    preview: 'يغطي هذا المساق المفاهيم الأساسية للخوارزميات وهياكل البيانات. ستتعلم عن التعقيد الزمني، خوارزميات الفرز، وتقنيات متقدمة لحل المشاكل.'
  },
  zh: {
    title: '算法导论',
    preview: '本课程涵盖算法和数据结构的基本概念。您将学习时间复杂度、排序算法和高级问题解决技术。'
  }
}

function Translation() {
  const { classId, noteId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const noteTitle = searchParams.get('noteTitle') || 'Introduction to Algorithms'
  const className = searchParams.get('className') || 'Class'
  const bloomColor = getClassColor(classId)
  
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [status, setStatus] = useState('Ready')
  const [translationProgress, setTranslationProgress] = useState(0)
  const [isTranslating, setIsTranslating] = useState(false)

  const handleStartTranslation = () => {
    if (!selectedLanguage) return
    
    setIsTranslating(true)
    setStatus('Processing')
    setTranslationProgress(0)

    // Simulate translation progress
    const interval = setInterval(() => {
      setTranslationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          // Randomly succeed or fail (80% success rate)
          const success = Math.random() > 0.2
          setStatus(success ? 'Ready' : 'Failed')
          setIsTranslating(false)
          return 100
        }
        return prev + (Math.random() * 12 + 3) // Variable speed progress
      })
    }, 200)
  }

  const handleRetry = () => {
    setStatus('Ready')
    setTranslationProgress(0)
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Ready':
        return {
          label: 'Ready',
          color: 'var(--color-status-ready)',
          bgColor: 'var(--color-status-ready-bg)'
        }
      case 'Processing':
        return {
          label: 'Processing',
          color: 'var(--color-status-processing)',
          bgColor: 'var(--color-status-processing-bg)'
        }
      case 'Failed':
        return {
          label: 'Failed',
          color: 'var(--color-status-failed)',
          bgColor: 'var(--color-status-failed-bg)'
        }
      default:
        return {
          label: 'Ready',
          color: 'var(--color-status-ready)',
          bgColor: 'var(--color-status-ready-bg)'
        }
    }
  }

  const statusConfig = getStatusConfig(status)
  const translation = selectedLanguage ? DEMO_TRANSLATIONS[selectedLanguage] : null

  return (
    <div 
      className="screen translation"
      style={{ '--bloom-color': bloomColor }}
    >
      <div className="translation__header">
        <button 
          className="translation__back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h2 className="translation__title">Translate Lecture</h2>
      </div>

      <div className="translation__content">
        {/* Left Side - Original Lecture Info */}
        <div className="translation__original">
          <div className="translation__original-card">
            <div className="translation__card-header">
              <div className="translation__card-icon">📚</div>
              <div className="translation__card-title">Original Lecture</div>
            </div>
            <div className="translation__lecture-info">
              <h3 className="translation__lecture-title">{noteTitle}</h3>
              <div className="translation__lecture-meta">
                <div className="translation__meta-item">
                  <span className="translation__meta-label">Class:</span>
                  <span className="translation__meta-value">{className}</span>
                </div>
                <div className="translation__meta-item">
                  <span className="translation__meta-label">Duration:</span>
                  <span className="translation__meta-value">15 min</span>
                </div>
                <div className="translation__meta-item">
                  <span className="translation__meta-label">Language:</span>
                  <span className="translation__meta-value">English</span>
                </div>
              </div>
              <div className="translation__original-preview">
                <p className="translation__preview-text">
                  This course covers fundamental concepts of algorithms and data structures. 
                  You'll learn about time complexity, sorting algorithms, and advanced problem-solving techniques.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Target Language & Preview */}
        <div className="translation__target">
          <div className="translation__target-card">
            <div className="translation__card-header">
              <div className="translation__card-icon">🌐</div>
              <div className="translation__card-title">Translation</div>
            </div>
            
            {/* Language Selector */}
            <div className="translation__language-section">
              <label className="translation__section-label">Target Language</label>
              <div className="translation__language-grid">
                {TARGET_LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    className={`translation__language-option ${selectedLanguage === lang.id ? 'translation__language-option--selected' : ''}`}
                    onClick={() => {
                      if (!isTranslating) {
                        setSelectedLanguage(lang.id)
                        setStatus('Ready')
                        setTranslationProgress(0)
                      }
                    }}
                    disabled={isTranslating}
                  >
                    <span className="translation__language-flag">{lang.flag}</span>
                    <div className="translation__language-info">
                      <div className="translation__language-name">{lang.name}</div>
                      <div className="translation__language-native">{lang.nativeName}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Translation Progress */}
            {isTranslating && (
              <div className="translation__progress-section">
                <div className="translation__progress-header">
                  <span className="translation__progress-label">Translating...</span>
                  <span className="translation__progress-percent">{Math.round(translationProgress)}%</span>
                </div>
                <div className="translation__progress-bar">
                  <div 
                    className="translation__progress-fill"
                    style={{ width: `${translationProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Translation Preview */}
            {translation && (status === 'Ready' || status === 'Failed') && (
              <div className="translation__preview-section">
                <div className="translation__preview-header">
                  <span className="translation__section-label">Translation Preview</span>
                  <div
                    className="translation__status-badge"
                    style={{
                      color: statusConfig.color,
                      backgroundColor: statusConfig.bgColor
                    }}
                  >
                    {statusConfig.label}
                  </div>
                </div>
                {status === 'Ready' ? (
                  <div className="translation__preview-content">
                    <h4 className="translation__preview-title">{translation.title}</h4>
                    <p className="translation__preview-text">{translation.preview}</p>
                  </div>
                ) : (
                  <div className="translation__error-state">
                    <div className="translation__error-icon">⚠️</div>
                    <p className="translation__error-message">
                      Translation failed. Please try again.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="translation__footer">
        {status === 'Failed' ? (
          <button
            className="translation__button translation__button--retry"
            onClick={handleRetry}
          >
            Retry Translation
          </button>
        ) : (
          <button
            className="translation__button translation__button--primary"
            onClick={handleStartTranslation}
            disabled={!selectedLanguage || isTranslating}
          >
            {isTranslating ? 'Translating...' : 'Start Translation'}
          </button>
        )}
      </div>
    </div>
  )
}

export default Translation
