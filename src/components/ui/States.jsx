import { AlertTriangleIcon, InboxIcon } from '../icons'
import styles from './States.module.css'

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className={styles.state} role="status">
      <span className={styles.spinner} />
      <span className={styles.title}>{label}</span>
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className={styles.state} role="alert">
      <span className={`${styles.iconWrap} ${styles['iconWrap--danger']}`}>
        <AlertTriangleIcon size={20} />
      </span>
      <span className={styles.title}>{title}</span>
      {description && <span className={styles.description}>{description}</span>}
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className={styles.state}>
      <span className={styles.iconWrap}>
        <InboxIcon size={20} />
      </span>
      <span className={styles.title}>{title}</span>
      {description && <span className={styles.description}>{description}</span>}
      {action}
    </div>
  )
}
