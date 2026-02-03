/**
 * Matches study-os-mobile ActionTile.tsx – icon, label, optional subtitle, optional badge (generate | generating | generated), optional onRegenerate (shown when badge is generated), optional onReset (shown when badge is generating), optional regenerating (loading state)
 */
export default function ActionTile({ icon, label, subtitle, badge, disabled, onPress, onRegenerate, onReset, regenerating }) {
  const badgeMod = regenerating ? 'generating' : badge === 'generated' ? 'generated' : badge === 'generating' ? 'generating' : 'generate'
  const showBadge = badge || regenerating
  const badgeClass = showBadge ? `so-action-tile-badge so-action-tile-badge--${badgeMod}` : ''
  const badgeLabel = regenerating ? 'Regenerating' : badge === 'generated' ? 'Generated' : badge === 'generating' ? 'Generating' : 'Generate'
  const showRegenerate = (badge === 'generated' || regenerating) && onRegenerate
  const showReset = badge === 'generating' && onReset
  return (
    <div className="so-action-tile-wrap">
      <button
        type="button"
        className="so-action-tile"
        onClick={onPress}
        disabled={disabled || regenerating}
      >
        {showBadge && <span className={badgeClass}>{badgeLabel}</span>}
        <span className="so-action-tile-icon" aria-hidden>{icon}</span>
        <span className="so-action-tile-label">{label}</span>
        {subtitle && <span className="so-action-tile-subtitle">{subtitle}</span>}
      </button>
      {showRegenerate && (
        <button
          type="button"
          className="so-action-tile-regenerate"
          disabled={regenerating}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!regenerating) onRegenerate()
          }}
        >
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </button>
      )}
      {showReset && (
        <button
          type="button"
          className="so-action-tile-reset"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onReset()
          }}
        >
          Reset
        </button>
      )}
    </div>
  )
}
