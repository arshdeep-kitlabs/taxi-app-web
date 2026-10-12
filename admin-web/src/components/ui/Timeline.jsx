import { formatDateTime } from '../../utils/formatters'
import styles from './Timeline.module.css'

/**
 * Generic vertical timeline. `steps`: [{ label, timestamp (nullable), tone }]
 * A null timestamp renders as "not yet reached"; tone 'cancelled' marks a
 * terminal negative step (e.g. ride cancelled).
 */
export function Timeline({ steps }) {
  return (
    <div className={styles.list}>
      {steps.map((step, index) => {
        const isDone = Boolean(step.timestamp)
        return (
          <div className={styles.step} key={step.label}>
            <div className={styles.rail}>
              <span
                className={`${styles.dot} ${isDone ? styles[`dot--${step.tone ?? 'done'}`] : ''}`}
              />
              {index < steps.length - 1 && <span className={styles.line} />}
            </div>
            <div className={styles.body}>
              <span className={`${styles.label} ${!isDone ? styles['label--pending'] : ''}`}>{step.label}</span>
              <span className={styles.time}>{isDone ? formatDateTime(step.timestamp) : 'Not yet reached'}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
