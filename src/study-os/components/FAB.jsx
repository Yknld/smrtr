export default function FAB({ onPress, ariaLabel = 'Add' }) {
  return (
    <button
      type="button"
      className="so-fab"
      onClick={onPress}
      aria-label={ariaLabel}
    >
      +
    </button>
  )
}
