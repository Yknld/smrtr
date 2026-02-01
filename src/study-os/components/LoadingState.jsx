export default function LoadingState({ count = 3 }) {
  return (
    <div className="so-loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="so-loading-skeleton" />
      ))}
    </div>
  )
}
