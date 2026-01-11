import { createPortal } from 'react-dom'
import './FloatingActionButton.css'

function FloatingActionButton({ onClick }) {
  return createPortal(
    <button
      className="floating-action-button"
      onClick={onClick}
      aria-label="Add material"
    >
      <span className="floating-action-button__icon">+</span>
    </button>,
    document.body
  )
}

export default FloatingActionButton
