import { useState, useEffect } from 'react'
import './EditNoteModal.css'

function EditNoteModal({ isOpen, onClose, note, onSave }) {
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (note) {
      setTitle(note.title || '')
    }
  }, [note])

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setIsSaving(false)
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    try {
      await onSave({ ...note, title: title.trim() })
      onClose()
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (note) {
      setTitle(note.title || '')
    }
    onClose()
  }

  if (!isOpen || !note) return null

  return (
    <div className="edit-note-modal-overlay" onClick={handleCancel}>
      <div className="edit-note-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-note-modal__header">
          <h2 className="edit-note-modal__title">Edit Lecture</h2>
          <button
            className="edit-note-modal__close"
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="edit-note-modal__form" onSubmit={handleSubmit}>
          <div className="edit-note-modal__field">
            <label htmlFor="edit-note-title" className="edit-note-modal__label">
              Lecture Name
            </label>
            <input
              id="edit-note-title"
              type="text"
              className="edit-note-modal__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter lecture name"
              autoFocus
              required
            />
          </div>

          <div className="edit-note-modal__actions">
            <button
              type="button"
              className="edit-note-modal__button edit-note-modal__button--cancel"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-note-modal__button edit-note-modal__button--save"
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditNoteModal
