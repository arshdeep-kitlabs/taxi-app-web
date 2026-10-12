import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { PasswordInput } from './PasswordInput'
import styles from './AuthPage.module.css'

const FIELD_MESSAGES = {
  REQUIRED: 'This cannot be left empty.',
  INVALID_FORMAT: 'That is not an email address we can use.',
  EMAIL_IN_USE: 'An account already exists with that address.',
  PASSWORD_TOO_SHORT: 'Use at least 10 characters.',
  PASSWORD_TOO_LONG: 'That is longer than 200 characters.',
  TOO_LONG: 'That is longer than this field accepts.',
}

const MESSAGES = {
  ADMIN_EMAIL_IN_USE: 'An admin account already exists with that email address.',
  VALIDATION_FAILED: 'Check the details below.',
}

export function SignupPage() {
  const { signUp, isSignedIn } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  /* Set once the account exists but is waiting on somebody to approve it. */
  const [pending, setPending] = useState(false)

  // The first account on a fresh install is activated and signed straight in.
  if (isSignedIn) return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
    setError(null)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      const result = await signUp(form)
      // `activated` false means it is queued rather than live. When it is
      // true the context has already signed them in, and the redirect above
      // takes over on the next render.
      if (!result.activated) setPending(true)
    } catch (failure) {
      if (failure.fields) setFieldErrors(failure.fields)
      setError(MESSAGES[failure.code] ?? failure.message ?? 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  if (pending) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <span className={styles.mark}>N</span>
            <span className={styles.brandName}>Nomad Admin</span>
          </div>

          <h1 className={styles.title}>Account created</h1>
          <div className={styles.success} role="status">
            <strong>{form.email}</strong> is registered, but cannot sign in yet. An existing admin
            has to approve it from Admin&nbsp;&amp;&nbsp;Roles. You will be able to sign in as soon
            as they do.
          </div>

          <p className={styles.footer}>
            <Link className={styles.link} to="/login">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const errorFor = (key) => (fieldErrors[key] ? FIELD_MESSAGES[fieldErrors[key]] ?? fieldErrors[key] : null)

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>N</span>
          <span className={styles.brandName}>Nomad Admin</span>
        </div>

        <h1 className={styles.title}>Create an account</h1>
        <p className={styles.subtitle}>
          New accounts are held until an existing admin approves them.
        </p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {error && (
            <div className={styles.alert} role="alert">
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className={styles.input}
              type="text"
              autoComplete="name"
              autoFocus
              required
              aria-invalid={Boolean(errorFor('name'))}
              value={form.name}
              onChange={update('name')}
            />
            {errorFor('name') && <span className={styles.fieldError}>{errorFor('name')}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Work email address
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(errorFor('email'))}
              value={form.email}
              onChange={update('email')}
            />
            {errorFor('email') && <span className={styles.fieldError}>{errorFor('email')}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errorFor('password'))}
              value={form.password}
              onChange={update('password')}
            />
            {errorFor('password') ? (
              <span className={styles.fieldError}>{errorFor('password')}</span>
            ) : (
              <span className={styles.hint}>At least 10 characters.</span>
            )}
          </div>

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link className={styles.link} to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
