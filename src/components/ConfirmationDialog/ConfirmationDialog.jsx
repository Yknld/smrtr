import './ConfirmationDialog.css'

function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null

  return (
    <div className="confirmation-dialog-overlay" onClick={onClose}>
      <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirmation-dialog__title">{title}</h3>
        <p className="confirmation-dialog__message">{message}</p>
        <div className="confirmation-dialog__actions">
          <button
            className="confirmation-dialog__button confirmation-dialog__button--cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="confirmation-dialog__button confirmation-dialog__button--confirm"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationDialog
