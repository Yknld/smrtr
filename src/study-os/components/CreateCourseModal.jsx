import { useState } from 'react'

const COURSE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#06B6D4', '#EF4444', '#6366F1',
]

export default function CreateCourseModal({ visible, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [selectedColor, setSelectedColor] = useState(COURSE_COLORS[0])
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!title.trim()) return
    setLoading(true)
    try {
      await onCreate(title.trim(), selectedColor)
      setTitle('')
      setSelectedColor(COURSE_COLORS[0])
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setTitle('')
    setSelectedColor(COURSE_COLORS[0])
    onClose()
  }

  if (!visible) return null

  return (
    <div className="so-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="so-modal-title">
      <div className="so-modal-backdrop" onClick={handleClose} aria-hidden />
      <div className="so-modal">
        <div className="so-modal-header">
          <h2 id="so-modal-title" className="so-modal-title">Create Course</h2>
          <button type="button" className="so-modal-close" onClick={handleClose} disabled={loading} aria-label="Close">&#215;</button>
        </div>
        <div className="so-modal-section">
          <label className="so-modal-label">Course Name</label>
          <input
            type="text"
            className="so-modal-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Biology"
            disabled={loading}
            autoFocus
          />
        </div>
        <div className="so-modal-section">
          <span className="so-modal-label">Color</span>
          <div className="so-modal-color-grid">
            {COURSE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={'so-modal-color-opt' + (selectedColor === color ? ' so-modal-color-opt--selected' : '')}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                disabled={loading}
                aria-pressed={selectedColor === color}
                aria-label={'Color ' + color}
              >
                {selectedColor === color ? '\u2713' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="so-modal-actions">
          <button type="button" className="so-modal-btn so-modal-btn--cancel" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="so-modal-btn so-modal-btn--create"
            onClick={handleCreate}
            disabled={!title.trim() || loading}
          >
            {loading ? '...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
