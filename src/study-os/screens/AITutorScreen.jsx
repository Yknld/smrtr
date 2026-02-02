/**
 * AI Tutor – chat with tutor_chat Edge Function. Aligned with study-os-mobile AITutorScreen.
 */
import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { supabase } from '../config/supabase'
import './screens.css'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isValidUuid(str) {
  return typeof str === 'string' && UUID_REGEX.test(str)
}

const MAX_MESSAGE_LENGTH = 2000

const SUGGESTED_ACTIONS = [
  { id: 'explain', label: 'Explain concept' },
  { id: 'quiz', label: 'Quiz me' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'podcast', label: 'Make podcast' },
]

const ACTION_PROMPTS = {
  explain: 'Can you explain a concept from this lesson?',
  quiz: 'Quiz me on this lesson',
  flashcards: 'Generate flashcards from this lesson',
  summarize: 'Summarize the key points of this lesson',
  podcast: 'Create a podcast-style summary of this lesson',
}

/** Render text with **bold** as <strong> (matches mobile FormattedMessage). */
function FormattedMessage({ content, isUser }) {
  const clean = content
    .replace(/^##\s+/gm, '')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/^\s*-\s+/gm, '• ')
  const parts = []
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match
  while ((match = boldRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: clean.slice(lastIndex, match.index), bold: false })
    }
    parts.push({ text: match[1], bold: true })
    lastIndex = boldRegex.lastIndex
  }
  if (lastIndex < clean.length) {
    parts.push({ text: clean.slice(lastIndex), bold: false })
  }
  return (
    <p className="so-tutor-message-text">
      {parts.map((part, i) =>
        part.bold ? (
          <strong key={i}>{part.text}</strong>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </p>
  )
}

export default function AITutorScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Lesson'

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!text) return

    setInput('')
    setMessages((m) => [...m, { role: 'user', id: String(Date.now()), text }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please sign in to use AI Tutor')
      }

      const { data, error: fnError } = await supabase.functions.invoke('tutor_chat', {
        body: {
          conversationId: conversationId,
          lessonId: lessonId && isValidUuid(lessonId) ? lessonId : null,
          message: text,
        },
      })

      if (fnError) {
        const msg = fnError.context?.body ?? fnError.message ?? 'Failed to get AI response'
        throw new Error(msg)
      }

      if (data?.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantText = data?.assistantMessage ?? 'No response received'
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          id: data?.messageId ?? String(Date.now() + 1),
          text: assistantText,
        },
      ])
    } catch (err) {
      const errorMessage = err.message || 'Failed to send message'
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          id: String(Date.now() + 1),
          text: 'Sorry, I encountered an error. Please try again.',
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleActionPress = (actionId, label) => {
    const prompt = ACTION_PROMPTS[actionId] ?? label
    setInput(prompt)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="so-screen">
      <header className="so-simple-header">
        <button type="button" className="so-simple-back" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-simple-title">{lessonTitle} – AI Tutor</h1>
        <span className="so-simple-spacer" />
      </header>

      <div className="so-tutor-content">
        {isEmpty && (
          <div className="so-tutor-suggested">
            <div className="so-tutor-suggested-inner">
              {SUGGESTED_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="so-tutor-chip"
                  onClick={() => handleActionPress(action.id, action.label)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="so-tutor-messages" ref={listRef} role="log" aria-live="polite">
          {isEmpty ? (
            <div className="so-tutor-empty">
              <p className="so-tutor-empty-title">Ask me anything</p>
              <p className="so-tutor-empty-subtitle">
                I can help explain concepts, quiz you, or generate study materials from "{lessonTitle}".
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`so-tutor-message so-tutor-message--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <span className="so-tutor-message-icon" aria-hidden>
                    <Icon name="chat" size={18} />
                  </span>
                )}
                {msg.role === 'user' ? (
                  <p className="so-tutor-message-text">{msg.text}</p>
                ) : (
                  <FormattedMessage content={msg.text} isUser={false} />
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="so-tutor-message so-tutor-message--assistant">
              <span className="so-tutor-message-icon" aria-hidden>
                <Icon name="chat" size={18} />
              </span>
              <p className="so-tutor-message-text so-tutor-typing">Thinking…</p>
            </div>
          )}
        </div>

        <div className="so-tutor-footer">
          <div className="so-tutor-input-bar">
            <input
              type="text"
              className="so-tutor-input"
              placeholder="Ask about this lesson…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              aria-label="Message"
              disabled={loading}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <button
              type="button"
              className="so-tutor-send"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <Icon name="send" size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
