import styles from './PlaceholderPage.module.css'

/**
 * Shared shell for modules whose navigation exists but whose detailed
 * screens have not been designed yet (per this generation's scope). Keeps
 * every not-yet-built module visually consistent instead of a raw 404.
 */
export function PlaceholderPage({ title, description, icon: IconComponent }) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.subtitle}>{description}</p>}
      </div>

      <div className={styles.panel}>
        {IconComponent && (
          <span className={styles.iconWrap}>
            <IconComponent size={22} />
          </span>
        )}
        <span className={styles.panelTitle}>{title} module scaffold</span>
        <p className={styles.panelDescription}>
          Navigation and routing for this module are in place. Its detailed screens will be
          designed in a follow-up pass.
        </p>
        <span className={styles.note}>Coming next</span>
      </div>
    </div>
  )
}
