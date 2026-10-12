import { SearchIcon } from '../icons'
import styles from './Toolbar.module.css'

/**
 * Consistent search + filter row used across every module's list view.
 */
export function Toolbar({ children }) {
  return <div className={styles.toolbar}>{children}</div>
}

export function SearchField({ value, onChange, placeholder = 'Search…', ariaLabel }) {
  return (
    <div className={styles.searchField}>
      <span className={styles.searchIcon}>
        <SearchIcon size={16} />
      </span>
      <input
        type="search"
        className={styles.searchInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
      />
    </div>
  )
}

export function FilterSelect({ value, onChange, options, ariaLabel }) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function ResultCount({ count, noun = 'result', pluralNoun }) {
  const plural = pluralNoun ?? (noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`)
  return (
    <span className={styles.resultCount}>
      {count} {count === 1 ? noun : plural}
    </span>
  )
}
