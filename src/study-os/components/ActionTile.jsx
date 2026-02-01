/**
 * Matches study-os-mobile ActionTile.tsx – icon, label, optional subtitle, optional badge (Generate | Generated)
 */
export default function ActionTile({ icon, label, subtitle, badge, disabled, onPress }) {
  const badgeClass = badge === 'Generated' ? 'so-action-tile-badge so-action-tile-badge--generated' : 'so-action-tile-badge so-action-tile-badge--generate'
  return (
    <button
      type="button"
      className="so-action-tile"
      onClick={onPress}
      disabled={disabled}
    >
      {badge && <span className={badgeClass}>{badge}</span>}
      <span className="so-action-tile-icon" aria-hidden>{icon}</span>
      <span className="so-action-tile-label">{label}</span>
      {subtitle && <span className="so-action-tile-subtitle">{subtitle}</span>}
    </button>
  )
}
