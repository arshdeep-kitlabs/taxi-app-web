const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-US')

export function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return currencyFormatter.format(value)
}

const preciseCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Like formatCurrency, but keeps cents — for small per-unit rates (e.g. $0.35/min). */
export function formatRate(value) {
  if (value === null || value === undefined) return '—'
  return preciseCurrencyFormatter.format(value)
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—'
  return numberFormatter.format(value)
}

/** Derives up-to-two-letter initials from a full name, for avatar chips. */
export function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`
  return initials.toUpperCase()
}

export function formatDateTime(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Formats a timestamp as a short "time ago" string (e.g. "3m ago", "2h ago").
 * Falls back to a short date once older than a day.
 */
export function formatRelativeTime(isoString, now = Date.now()) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMs = now - date.getTime()
  const diffSec = Math.round(diffMs / 1000)

  if (diffSec < 45) return 'Just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`

  return formatDateTime(isoString)
}
