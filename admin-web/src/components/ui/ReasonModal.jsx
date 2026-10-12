import { useState } from 'react'
import { Modal } from './Modal'
import { FormField, TextArea } from './FormField'

/**
 * Reusable "reason/note required" modal — backs reject document, request
 * re-upload, reject application and request-changes flows, so the pattern
 * (and validation) is identical everywhere it appears.
 */
export function ReasonModal({
  title,
  description,
  fieldLabel = 'Reason',
  placeholder = 'Explain what needs to change…',
  confirmLabel = 'Confirm',
  confirmTone = 'primary',
  onCancel,
  onConfirm,
}) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn--${confirmTone}`}
            disabled={trimmed.length === 0}
            onClick={() => onConfirm(trimmed)}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {description && <p className="panel-header__subtitle">{description}</p>}
      <FormField label={fieldLabel}>
        <TextArea
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={placeholder}
        />
      </FormField>
    </Modal>
  )
}
