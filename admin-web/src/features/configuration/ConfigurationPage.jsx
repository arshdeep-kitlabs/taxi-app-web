import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getAppConfig, saveAppConfig } from '../../services/api/appConfigService'
import { FormField, TextInput } from '../../components/ui/FormField'
import { DocumentEditor, VehicleDetailsEditor } from './DocumentEditor'
import {
  AssignmentIcon, PromotionsIcon, ShieldIcon, SupportIcon, WrenchIcon,
} from '../../components/icons'
import { LoadingState } from '../../components/ui/States'
import styles from './ConfigurationPage.module.css'

/*
  The app's configuration, as the driver app reads it.

  Everything on this screen is live: a save reaches GET /config within a
  second, with no deploy and no restart. That is also why the whole document is
  sent back on save — a partial update has no answer for a removed country or a
  reordered document list, so the screen edits the document it loaded and
  returns all of it.
*/

/*
  Sign-in, Applications and Money & rides are deliberately not here.

  Their values are still in the document and still served to the app — the
  screen loads the whole thing and sends the whole thing back, so what has no
  editor is carried through untouched rather than dropped.
*/
const TABS = [
  { key: 'branding', label: 'Branding & theme', icon: PromotionsIcon, blurb: 'How the app looks' },
  { key: 'features', label: 'Features', icon: WrenchIcon, blurb: 'Turn things on and off' },
  { key: 'rules', label: 'Codes & rules', icon: ShieldIcon, blurb: 'Sign-up codes and age limit' },
  { key: 'support', label: 'Support & legal', icon: SupportIcon, blurb: 'How drivers reach you' },
  { key: 'documents', label: 'Documents', icon: AssignmentIcon, blurb: 'What drivers send, and what it is called' },
]

/** A titled block, so every screen reads the same way. */
function Card({ title, hint, children }) {
  return (
    <section className={styles.card}>
      {title && (
        <header className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{title}</h2>
          {hint && <p className={styles.cardHint}>{hint}</p>}
        </header>
      )}
      {children}
    </section>
  )
}

/** Shows the branding as the driver's first screen will wear it. */
function BrandPreview({ config }) {
  const { pageBackground, text, accent } = config.theme.colors
  return (
    <div className={styles.preview} style={{ background: pageBackground }}>
      <div className={styles.previewPhone} style={{ background: pageBackground, color: text }}>
        {config.branding.logoUrl ? (
          <img className={styles.previewLogo} src={config.branding.logoUrl} alt="" />
        ) : (
          <div className={styles.previewLogo} style={{ background: accent }} />
        )}
        <div className={styles.previewName} style={{ color: text }}>
          {config.branding.appName || 'App name'}
        </div>
        <div className={styles.previewLine} style={{ background: text, opacity: 0.12 }} />
        <div className={styles.previewLine} style={{ background: text, opacity: 0.12, width: '60%' }} />
        <div className={styles.previewCta} style={{ background: accent, color: pageBackground }}>
          Continue
        </div>
      </div>
    </div>
  )
}

/** Reads and writes a nested path without mutating what React is holding. */
const read = (object, path) =>
  path.split('.').reduce((value, key) => (value == null ? value : value[key]), object)

function write(object, path, value) {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...object, [head]: value }
  return { ...object, [head]: write(object[head] ?? {}, rest.join('.'), value) }
}

function Field({ config, path, label, hint, type = 'text', errors, onChange, ...rest }) {
  const problem = errors?.[path]
  return (
    <FormField label={label} hint={problem ?? hint}>
      <TextInput
        type={type}
        value={read(config, path) ?? ''}
        aria-invalid={problem ? 'true' : undefined}
        onChange={(event) =>
          onChange(path, type === 'number' ? Number(event.target.value) : event.target.value)
        }
        {...rest}
      />
    </FormField>
  )
}

function ColourField({ config, path, label, errors, onChange }) {
  const value = read(config, path) ?? '#000000'
  return (
    <FormField label={label} hint={errors?.[path]}>
      <div className={styles.colour}>
        <input
          type="color"
          className={styles.swatch}
          value={value}
          onChange={(event) => onChange(path, event.target.value)}
          aria-label={`${label} colour picker`}
        />
        <TextInput value={value} onChange={(event) => onChange(path, event.target.value)} />
      </div>
    </FormField>
  )
}

function Toggle({ config, path, label, hint, onChange }) {
  const value = Boolean(read(config, path))
  return (
    <div className={styles.toggleRow}>
      <div>
        <div className={styles.toggleLabel}>{label}</div>
        {hint && <div className={styles.toggleHint}>{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
        onClick={() => onChange(path, !value)}
      >
        <span className={styles.knob} />
      </button>
    </div>
  )
}



export function ConfigurationPage() {
  const { section } = useParams()
  const navigate = useNavigate()


  const [config, setConfig] = useState(null)
  const [original, setOriginal] = useState(null)
  const [errors, setErrors] = useState(null)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  /*
    The section list sticks below the header rather than at the top of the
    viewport, or the header sits over it and the first sections read as
    missing. The offset is the header's real height, measured — it changes with
    the window, because the sentence under the title wraps.
  */
  const headerRef = useRef(null)
  const pageRef = useRef(null)

  useEffect(() => {
    const header = headerRef.current
    const page = pageRef.current
    if (!header || !page) return

    const measure = () =>
      page.style.setProperty('--config-header-h', `${header.offsetHeight}px`)

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [Boolean(config)])

  useEffect(() => {
    let cancelled = false
    getAppConfig()
      .then((loaded) => {
        if (cancelled) return
        setConfig(loaded)
        setOriginal(loaded)
      })
      .catch((failure) => !cancelled && setStatus({ bad: true, text: failure.message }))
    return () => {
      cancelled = true
    }
  }, [])

  const isDirty = useMemo(
    () => Boolean(config && original) && JSON.stringify(config) !== JSON.stringify(original),
    [config, original],
  )

  const set = (path, value) => {
    setConfig((current) => write(current, path, value))
    setStatus(null)
  }

  const onSave = async () => {
    setBusy(true)
    setErrors(null)
    setStatus(null)
    try {
      const saved = await saveAppConfig(config)
      setConfig(saved)
      setOriginal(saved)
      setStatus({ text: 'Saved. The driver app picks this up within a second.' })
    } catch (failure) {
      setErrors(failure.fields ?? null)
      setStatus({
        bad: true,
        text: failure.fields
          ? 'Some values were refused. They are marked below.'
          : (failure.message ?? 'Could not save.'),
      })
    } finally {
      setBusy(false)
    }
  }

  // The address is the source of truth for which section is open, so a
  // refresh, a bookmark or a pasted link all land where they left off.
  if (!section) return <Navigate to={`/configuration/${TABS[0].key}`} replace />
  const tab = TABS.some((entry) => entry.key === section) ? section : TABS[0].key

  if (!config) return <LoadingState />

  const field = (path, label, extra = {}) => (
    <Field key={path} config={config} path={path} label={label} errors={errors} onChange={set} {...extra} />
  )

  const current = TABS.find((entry) => entry.key === tab)

  return (
    <div className={styles.page} ref={pageRef}>
      {/* Sticky, so Save stays reachable down a long list of documents without
          a floating bar covering the page. */}
      <header className={styles.header} ref={headerRef}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Configuration</h1>
          <p className={styles.subtitle}>
            Everything here is live. Change it, press Save, and every driver's
            phone picks it up the next time it asks — usually within a second.
            Nobody has to update the app.
          </p>
        </div>
        <div className={styles.actions}>
          {isDirty && (
            <span className={styles.dirty}>
              <span className={styles.dot} />
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!isDirty || busy}
            onClick={() => {
              setConfig(original)
              setErrors(null)
              setStatus(null)
            }}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!isDirty || busy}
            onClick={onSave}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </header>

      {status && (
        <div className={status.bad ? styles.error : styles.ok} role="status">
          {status.text}
        </div>
      )}

      <div className={styles.layout}>
        {/* Down the side rather than across the top: eight sections wrap into
            two rows of tabs, and a wrapped tab strip is hard to scan. */}
        <nav className={styles.sections} aria-label="Configuration sections">
          {TABS.map((entry) => {
            const Icon = entry.icon
            const open = tab === entry.key
            return (
              <button
                key={entry.key}
                type="button"
                aria-current={open ? 'page' : undefined}
                className={`${styles.section} ${open ? styles.sectionOn : ''}`}
                onClick={() => navigate(`/configuration/${entry.key}`)}
              >
                <Icon size={18} />
                <span className={styles.sectionText}>
                  <span className={styles.sectionLabel}>{entry.label}</span>
                  <span className={styles.sectionBlurb}>{entry.blurb}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className={styles.content}>
          <div className={styles.contentHead}>
            <h2 className={styles.contentTitle}>{current.label}</h2>
            <p className={styles.contentBlurb}>{current.blurb}</p>
          </div>

          {tab === 'branding' && (
            <>
              <Card title="Name and logo" hint="The first thing a driver sees when they open the app.">
                <div className={styles.grid}>
                  {field('branding.appName', 'App name', {
                    hint: 'Shown under the logo on the sign-in screen.',
                  })}
                  {field('branding.logoUrl', 'Logo image link', {
                    hint: 'Paste a link to the image and watch the preview below.',
                  })}
                  {field('minimumAppVersion', 'Minimum app version', {
                    hint: 'A driver on an older version is asked to update before they can sign in.',
                  })}
                </div>
              </Card>
              <Card title="Colours" hint="Change one and the phone on the right updates. That is what drivers will see.">
                <div className={styles.split}>
                  <div className={styles.grid}>
                    <ColourField config={config} path="theme.colors.pageBackground" label="Page background" errors={errors} onChange={set} />
                    <ColourField config={config} path="theme.colors.text" label="Text" errors={errors} onChange={set} />
                    <ColourField config={config} path="theme.colors.accent" label="Accent" errors={errors} onChange={set} />
                  </div>
                  <BrandPreview config={config} />
                </div>
              </Card>
            </>
          )}

          {tab === 'features' && (
            <Card hint="Turning something off hides it from drivers straight away. Nothing is deleted — switch it back on and everything is as they left it.">
              <div className={styles.toggles}>
                <Toggle config={config} path="features.phoneSignIn" label="Phone sign-in" hint="Lets a driver sign in with their phone number and a code by text." onChange={set} />
                <Toggle config={config} path="features.emailSignIn" label="Email sign-in" hint="Lets them use an email address instead. With only one of these on, the app stops offering a choice." onChange={set} />
                <Toggle config={config} path="features.socialSignIn" label="Apple and Google" hint="The Continue with Apple and Continue with Google buttons. Off means they are simply not there." onChange={set} />
                <Toggle config={config} path="features.genderPreference" label="Gender-specific riding" hint="Lets a driver choose to carry only female or only male passengers. Turning it off stops that happening but keeps what each driver chose, so switching it back on puts everyone where they were." onChange={set} />
              </div>
            </Card>
          )}

          {tab === 'rules' && (
            <>
              <Card title="Verification code" hint="The code a driver receives by text when they sign in.">
                <div className={styles.grid}>
                  {field('otp.codeLength', 'How many digits', {
                    type: 'number', min: 4, max: 8,
                    hint: 'Four gives a code like 4821.',
                  })}
                  {field('otp.expiresInMinutes', 'Minutes before it stops working', {
                    type: 'number', min: 1,
                    hint: 'After this the driver has to ask for a new one.',
                  })}
                  {field('otp.resendAfterSeconds', 'Seconds before they can ask again', {
                    type: 'number', min: 0,
                    hint: 'Stops someone tapping Send again over and over.',
                  })}
                </div>
              </Card>
              <Card title="Who can drive">
                <div className={styles.grid}>
                  {field('rules.minimumAgeYears', 'Youngest age allowed', {
                    type: 'number', min: 16,
                    hint: 'Someone younger than this cannot finish signing up.',
                  })}
                </div>
              </Card>
            </>
          )}

          {tab === 'support' && (
            <>
              <Card title="Getting in touch" hint="Shown on the Help screen, for a driver who is stuck.">
                <div className={styles.grid}>
                  {field('support.email', 'Support email', {
                    type: 'email',
                    hint: 'Tapping it opens their mail app with this address filled in.',
                  })}
                  {field('support.phone', 'Support phone', {
                    hint: 'Tapping it starts a call. Include the country code.',
                  })}
                </div>
              </Card>
              <Card title="Terms and privacy" hint="The two links at the bottom of the sign-up form. We record which version each driver agreed to.">
                <div className={styles.grid}>
                  {field('legal.terms.url', 'Terms of service link', {
                    hint: 'Opens in the app when a driver taps it.',
                  })}
                  {field('legal.privacy.url', 'Privacy policy link')}
                </div>
              </Card>
            </>
          )}

          {tab === 'documents' && (
            <>
              <Card
                title="Documents"
                hint="The Driver App decides which documents, photos and details it asks for, so those are fixed here. What you can change is how each one is named: drivers see these names on their Review screen, and reviewers see them on an application."
              >
                <DocumentEditor
                  documents={config.documents.documents}
                  errors={errors}
                  onChange={(next) => set('documents.documents', next)}
                />
              </Card>
              <Card
                title="Vehicle details"
                hint="The form above Vehicle documents on the same screen. The names show on the Review screen; the year range is checked by the server each time the app saves the form."
              >
                <VehicleDetailsEditor
                  fields={config.documents.vehicleDetails.fields}
                  errors={errors}
                  onChange={(next) => set('documents.vehicleDetails.fields', next)}
                />
              </Card>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
