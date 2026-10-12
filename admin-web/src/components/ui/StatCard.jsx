import { TrendUpIcon, TrendDownIcon } from '../icons'
import styles from './StatCard.module.css'

export function StatCard({ label, value, deltaLabel, trend = 'flat', icon: IconComponent }) {
  const TrendIcon = trend === 'up' ? TrendUpIcon : trend === 'down' ? TrendDownIcon : null

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {IconComponent && (
          <span className={styles.iconWrap}>
            <IconComponent size={18} />
          </span>
        )}
      </div>
      <span className={styles.value}>{value}</span>
      {deltaLabel && (
        <span className={`${styles.delta} ${styles[`delta--${trend}`]}`}>
          {TrendIcon && <TrendIcon size={14} />}
          {deltaLabel}
        </span>
      )}
    </div>
  )
}
