import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from '../../components/icons'
import styles from './AuthPage.module.css'

/**
 * A password box that can show what was typed.
 *
 * Both auth screens use it, so the reveal behaves the same on each. The
 * revealed state is per-field and resets on every mount: nothing a person
 * uncovered stays uncovered after they leave the screen.
 */
export function PasswordInput({ id, autoComplete, ...props }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className={styles.passwordWrap}>
      <input
        {...props}
        id={id}
        className={`${styles.input} ${styles.passwordInput}`}
        type={revealed ? 'text' : 'password'}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className={styles.reveal}
        onClick={() => setRevealed((shown) => !shown)}
        // The control is the label, so a screen reader hears what pressing it
        // will do rather than what it is.
        aria-label={revealed ? 'Hide password' : 'Show password'}
        aria-pressed={revealed}
        // Not a step in filling the form: tabbing goes straight to the button.
        tabIndex={-1}
      >
        {revealed ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  )
}
