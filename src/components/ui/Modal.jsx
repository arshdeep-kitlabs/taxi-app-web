import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../icons'
import styles from './Modal.module.css'

/**
 * Generic modal shell — used for confirmations and reason/note capture
 * (reject, request changes, request re-upload) across the app.
 *
 * `size` widens it for the one job a 440px dialog cannot do: showing a
 * document well enough to decide on it.
 */
export function Modal({ title, onClose, children, footer, size = 'default' }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`${styles.panel} ${size === "wide" ? styles["panel--wide"] : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
