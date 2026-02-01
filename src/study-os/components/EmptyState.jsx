export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="so-empty">
      {icon && <div className="so-empty-icon" aria-hidden>{icon}</div>}
      <p className="so-empty-title">{title}</p>
      {subtitle && <p className="so-empty-subtitle">{subtitle}</p>}
      {actionLabel && onAction && (
        <button type="button" className="so-empty-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
