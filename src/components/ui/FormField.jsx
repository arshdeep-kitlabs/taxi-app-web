import styles from './FormField.module.css'

export function FormField({ label, hint, children }) {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  )
}

export function TextInput({ className = '', ...props }) {
  return <input {...props} className={`${styles.input} ${className}`.trim()} />
}

export function TextArea({ className = '', ...props }) {
  return <textarea {...props} className={`${styles.textarea} ${className}`.trim()} />
}

export function Select({ options, className = '', ...props }) {
  return (
    <select {...props} className={`${styles.input} ${className}`.trim()}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
