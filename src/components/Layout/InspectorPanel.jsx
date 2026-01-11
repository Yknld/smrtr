import './InspectorPanel.css'

function InspectorPanel({ isOpen, onToggle }) {
  return (
    <>
      {isOpen && (
        <aside className="inspector-panel">
          <div className="inspector-panel__header">
            <h2 className="inspector-panel__title">Inspector</h2>
            <button 
              className="inspector-panel__close"
              onClick={onToggle}
              aria-label="Close inspector"
            >
              ×
            </button>
          </div>
          <div className="inspector-panel__content">
            {/* Inspector content will be added later */}
          </div>
        </aside>
      )}
      {!isOpen && (
        <button 
          className="inspector-panel__toggle"
          onClick={onToggle}
          aria-label="Open inspector"
        >
          ⊞
        </button>
      )}
    </>
  )
}

export default InspectorPanel
