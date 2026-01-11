import { useState, useEffect } from 'react'
import './AddMaterialModal.css'

const UPLOAD_TYPES = [
  { id: 'pdf', label: 'PDF', icon: '📄' },
  { id: 'slides', label: 'Slides', icon: '📊' },
  { id: 'audio', label: 'Lecture Audio/Video', icon: '🎙️' },
  { id: 'youtube', label: 'YouTube Link', icon: '▶️' }
]

const DEMO_CLASSES = [
  { id: '1', name: 'Introduction to Computer Science' },
  { id: '2', name: 'Linear Algebra' },
  { id: '3', name: 'History of Art' },
  { id: '4', name: 'Organic Chemistry' }
]

function AddMaterialModal({ isOpen, onClose, onUploadComplete, classId }) {
  const [selectedType, setSelectedType] = useState(null)
  const [selectedClassId, setSelectedClassId] = useState(classId || '')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Update selectedClassId when classId prop changes
  useEffect(() => {
    if (classId) {
      setSelectedClassId(classId)
    }
  }, [classId])

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null)
      setSelectedType(null)
      setYoutubeUrl('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId)
    setYoutubeUrl('')
    setSelectedFile(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    const effectiveClassId = classId || selectedClassId
    if (!selectedType || !effectiveClassId) return
    if (selectedType === 'youtube' && !youtubeUrl.trim()) return

    setUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          // Wait a moment then close
          setTimeout(() => {
            const selectedClass = DEMO_CLASSES.find(c => c.id === selectedClassId)
            const uploadType = UPLOAD_TYPES.find(t => t.id === selectedType)
            
            onUploadComplete({
              id: `n${Date.now()}`,
              classId: classId || selectedClassId,
              title: selectedType === 'youtube' 
                ? youtubeUrl 
                : selectedFile?.name.replace(/\.[^/.]+$/, '') || `${uploadType.label} - ${selectedClass?.name || 'Untitled'}`,
              updatedAt: new Date().toISOString(),
              duration: Math.floor(Math.random() * 20) + 5,
              status: 'Processing'
            })

            // Reset form
            setUploading(false)
            setUploadProgress(0)
            setSelectedType(null)
            setSelectedClassId('')
            setYoutubeUrl('')
            onClose()
          }, 500)
          return 100
        }
        return prev + (Math.random() * 15 + 5) // Variable speed progress
      })
    }, 200)
  }

  const handleClose = () => {
    if (uploading) return // Prevent closing during upload
    setSelectedType(null)
    setSelectedClassId('')
    setYoutubeUrl('')
    setSelectedFile(null)
    onClose()
  }

  const effectiveClassId = classId || selectedClassId
  const canUpload = selectedType && effectiveClassId && (
    selectedType === 'youtube' ? youtubeUrl.trim() : selectedFile
  )

  return (
    <div className="add-material-modal-overlay" onClick={handleClose}>
      <div className="add-material-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-material-modal__header">
          <h2 className="add-material-modal__title">Add Material</h2>
          <button 
            className="add-material-modal__close"
            onClick={handleClose}
            disabled={uploading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="add-material-modal__content">
          {/* Upload Type Selection */}
          <div className="add-material-modal__section">
            <label className="add-material-modal__label">Upload Type</label>
            <div className="add-material-modal__type-grid">
              {UPLOAD_TYPES.map(type => (
                <button
                  key={type.id}
                  className={`add-material-modal__type-card ${selectedType === type.id ? 'add-material-modal__type-card--selected' : ''}`}
                  onClick={() => handleTypeSelect(type.id)}
                  disabled={uploading}
                >
                  <div className="add-material-modal__type-icon">{type.icon}</div>
                  <div className="add-material-modal__type-label">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* YouTube URL Input */}
          {selectedType === 'youtube' && (
            <div className="add-material-modal__section">
              <label className="add-material-modal__label" htmlFor="youtube-url">
                YouTube URL
              </label>
              <input
                id="youtube-url"
                type="text"
                className="add-material-modal__input"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={uploading}
              />
            </div>
          )}

          {/* File Upload Input */}
          {selectedType && selectedType !== 'youtube' && (
            <div className="add-material-modal__section">
              <label className="add-material-modal__label" htmlFor="file-upload">
                Upload File
              </label>
              <div className="add-material-modal__file-upload-wrapper">
                <input
                  id="file-upload"
                  type="file"
                  className="add-material-modal__file-input"
                  onChange={handleFileChange}
                  disabled={uploading}
                  accept={
                    selectedType === 'pdf' ? '.pdf' :
                    selectedType === 'slides' ? '.ppt,.pptx,.pdf' :
                    selectedType === 'audio' ? '.mp3,.mp4,.wav,.m4a,.mov,.avi' :
                    '*'
                  }
                />
                <label htmlFor="file-upload" className="add-material-modal__file-upload-button">
                  {selectedFile ? selectedFile.name : 'Choose file'}
                </label>
              </div>
              {selectedFile && (
                <div className="add-material-modal__file-info">
                  <span className="add-material-modal__file-name">{selectedFile.name}</span>
                  <span className="add-material-modal__file-size">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Class Selector - only show if classId not provided */}
          {!classId && (
            <div className="add-material-modal__section">
              <label className="add-material-modal__label" htmlFor="class-selector">
                Class
              </label>
              <select
                id="class-selector"
                className="add-material-modal__select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={uploading}
              >
                <option value="">Select a class</option>
                {DEMO_CLASSES.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="add-material-modal__progress">
              <div className="add-material-modal__progress-bar">
                <div 
                  className="add-material-modal__progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="add-material-modal__progress-text">
                Uploading... {Math.round(uploadProgress)}%
              </div>
            </div>
          )}
        </div>

        <div className="add-material-modal__footer">
          <button
            className="add-material-modal__cancel-button"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="add-material-modal__upload-button"
            onClick={handleUpload}
            disabled={!canUpload || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddMaterialModal
