import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Landing.css'

const FAQ_ITEMS = [
  {
    id: 1,
    question: 'How does Smartr help me study?',
    answer: 'Smartr uses AI to transform your lectures into study materials. Upload your lecture content, and we\'ll generate summaries, create practice quizzes, and provide translations to help you learn more effectively.'
  },
  {
    id: 2,
    question: 'What file formats do you support?',
    answer: 'You can upload lectures in various formats including PDF, video files, audio files, and text documents. Our AI processes these files to create comprehensive study materials.'
  },
  {
    id: 3,
    question: 'Is my data secure?',
    answer: 'Yes, we take data security seriously. Your uploaded content is encrypted and stored securely. We never share your data with third parties without your explicit consent.'
  },
  {
    id: 4,
    question: 'Can I use Smartr on mobile devices?',
    answer: 'Yes! Smartr is fully responsive and works on desktop, tablet, and mobile devices. You can access your study materials anytime, anywhere.'
  },
  {
    id: 5,
    question: 'How much does it cost?',
    answer: 'Smartr offers both free and premium plans. The free plan includes basic features, while premium plans unlock advanced AI capabilities, unlimited uploads, and priority support.'
  }
]

function Landing() {
  const navigate = useNavigate()
  const [openFaqId, setOpenFaqId] = useState(null)

  const handleClassesClick = () => {
    navigate('/home')
  }

  const handlePracticeClick = () => {
    navigate('/practice')
  }

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id)
  }

  return (
    <div className="landing">
      <div className="landing__header">
        <button 
          className="landing__auth-button"
          onClick={() => navigate('/login')}
        >
          Sign up / Log in
        </button>
      </div>
      <div className="landing__content">
        <div className="landing__brand">
          <h1 className="landing__brand-title">Smartr</h1>
        </div>
        <div className="landing__title">
          <h2>Transform your learning</h2>
          <p className="landing__description">
            Smartr helps you study smarter. Upload your lectures, get AI-generated summaries, practice with interactive quizzes, and translate content to any language—all in one place.
          </p>
        </div>
        <div className="landing__actions">
          <button
            className="landing__button landing__button--primary"
            onClick={handleClassesClick}
          >
            <span className="landing__button-icon">📚</span>
            <span>Classes</span>
          </button>
          <button
            className="landing__button landing__button--secondary"
            onClick={handlePracticeClick}
          >
            <span className="landing__button-icon">✏️</span>
            <span>Practice</span>
          </button>
        </div>

        <div className="landing__faq">
          <h2 className="landing__faq-title">Frequently Asked Questions</h2>
          <div className="landing__faq-list">
            {FAQ_ITEMS.map((item) => (
              <FAQItem
                key={item.id}
                id={item.id}
                question={item.question}
                answer={item.answer}
                isOpen={openFaqId === item.id}
                onToggle={() => toggleFaq(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FAQItem({ id, question, answer, isOpen, onToggle }) {
  return (
    <div className={`landing__faq-item ${isOpen ? 'landing__faq-item--open' : ''}`}>
      <button
        className="landing__faq-question"
        onClick={onToggle}
      >
        <span className="landing__faq-question-text">{question}</span>
        <span className={`landing__faq-icon ${isOpen ? 'landing__faq-icon--open' : ''}`}>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div className="landing__faq-answer">
          <p className="landing__faq-answer-text">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default Landing
