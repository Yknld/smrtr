export default function SearchBar({ value, onChange, placeholder = 'Search courses...' }) {
  return (
    <div className="so-search-wrap">
      <input
        type="search"
        className="so-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}
