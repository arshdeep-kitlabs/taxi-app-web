import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import styles from './AuthPage.module.css'

/**
 * Everything inside the panel sits behind this.
 *
 * It is a convenience, not a security boundary — the API refuses an
 * unauthenticated call whatever the browser renders. What it does is keep a
 * signed-out person from seeing a shell full of empty, failing pages.
 */
export function RequireAuth() {
  const { isSignedIn, isChecking } = useAuth()
  const location = useLocation()

  if (isChecking) {
    return (
      <div className={styles.checking} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <span>Checking your session…</span>
      </div>
    )
  }

  if (!isSignedIn) {
    // `from` sends them back where they were aiming once they are in.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
