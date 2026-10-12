const TONE_CLASS = {
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
  info: 'badge--info',
  neutral: 'badge--neutral',
}

/**
 * Generic status pill. Prefer a domain-specific wrapper (e.g. StatusBadge)
 * over passing raw copy here, so status vocabulary stays consistent.
 */
export function Badge({ tone = 'neutral', children, withDot = false, className = '' }) {
  return (
    <span className={`badge ${TONE_CLASS[tone] ?? TONE_CLASS.neutral} ${className}`}>
      {withDot && <span className="badge__dot" />}
      {children}
    </span>
  )
}
