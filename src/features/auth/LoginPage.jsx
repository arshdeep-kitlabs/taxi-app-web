import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { PasswordInput } from './PasswordInput'
import styles from './AuthPage.module.css'

/** What to show for each code the sign-in call can fail with. */
const MESSAGES = {
  INVALID_CREDENTIALS: 'That email address and password do not match an account.',
  ADMIN_PENDING_APPROVAL:
    'Your account is waiting for approval. An existing admin has to let you in before you can sign in.',
  ADMIN_SUSPENDED: 'This account has been suspended. Speak to a Super Admin.',
  ADMIN_REJECTED: 'This account was not approved.',
  VALIDATION_FAILED: 'Check the email address and password below.',
}

export function LoginPage() {
  const { signIn, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Already in — usually a back-button press onto the sign-in screen.
  if (isSignedIn) return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError(null)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(form)
      // Back to whatever they were aiming at before the guard intercepted.
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true })
    } catch (failure) {
      setError(MESSAGES[failure.code] ?? failure.message ?? 'Could not sign in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>N</span>
          <span className={styles.brandName}>Nomad Admin</span>
        </div>

        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Use the email address your account was created with.</p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {error && (
            <div className={styles.alert} role="alert">
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={form.email}
              onChange={update('email')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={update('password')}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footer}>
          No account yet?{' '}
          <Link className={styles.link} to="/signup">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
