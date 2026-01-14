import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Podcast.css'

function Podcast() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')

  const handleSpeakNow = () => {
    setIsRecording(!isRecording)
    // TODO: Implement voice recording functionality
    if (!isRecording) {
      // Start recording
      console.log('Recording started')
    } else {
      // Stop recording
      console.log('Recording stopped')
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="podcast">
      <div className="podcast__header">
        <button className="podcast__back-button" onClick={handleBack}>
          ← Back
        </button>
      </div>

      <div className="podcast__content">
        <h1 className="podcast__title">Podcasts</h1>
        <div className="podcast__message">
          <h2 className="podcast__message-title">AI-generated podcasts coming soon</h2>
          <p className="podcast__message-description">
            Your lessons will be transformed into engaging podcast-style content
          </p>
        </div>

        <div className="podcast__speak-section">
          <button
            className={`podcast__speak-button ${isRecording ? 'podcast__speak-button--recording' : ''}`}
            onClick={handleSpeakNow}
          >
            <span className="podcast__speak-icon">
              {isRecording ? '⏹' : '🎤'}
            </span>
            <span className="podcast__speak-text">
              {isRecording ? 'Stop Recording' : 'Speak Now'}
            </span>
          </button>
          
          {isRecording && (
            <div className="podcast__recording-indicator">
              <span className="podcast__recording-dot"></span>
              <span>Listening...</span>
            </div>
          )}

          {transcript && (
            <div className="podcast__transcript">
              <h3>Transcript</h3>
              <p>{transcript}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Podcast
