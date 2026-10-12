import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '../../components/icons'
import { FormField, TextInput } from '../../components/ui/FormField'
import styles from './ConfigurationPage.module.css'

/*
  The document checklist, limited to what can safely change.

  The Driver App draws its Documents and Vehicle screens itself: which
  documents exist, which sides each one photographs, the ID types, the typed
  details and which of them are mandatory are all fixed in the app. Adding or
  removing any of those here would not reach the driver's phone, but the
  server would start enforcing it, and a driver could end up unable to submit.
  So the structure is shown, keyed by the references the app sends, and
  only these can be edited:

    labels       read back by GET /review (the app's Review screen) and by the
                 admin review screens, so renaming one is safe
    min / max    on a number field such as the vehicle year, enforced by the
                 server when the app saves the form

  Anything else in the document (descriptions, placeholders, helpers) is
  carried through untouched, because the whole document is saved back.
*/

const FIELD_TYPE_LABELS = {
  text: 'Text',
  number: 'Whole number',
  month: 'Month and year',
  select: 'Choice from a list',
}

/** Replaces one entry of a list without mutating it. */
const replaceAt = (list, index, value) => list.map((item, i) => (i === index ? value : item))

/** The reference the app sends, shown but never editable. */
function Ref({ children }) {
  return <code className={styles.ref}>{children}</code>
}

/** One editable label beside the reference it belongs to. */
function LabelRow({ reference, kind, value, error, onChange }) {
  return (
    <div className={styles.labelRow}>
      <div className={styles.labelRowRef}>
        <Ref>{reference}</Ref>
        {kind && <span className={styles.labelRowKind}>{kind}</span>}
      </div>
      <FormField hint={error}>
        <TextInput
          value={value ?? ''}
          aria-label={`Label for ${reference}`}
          aria-invalid={error ? 'true' : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </FormField>
    </div>
  )
}

function Photos({ images, errors, pathPrefix, onChange }) {
  return (
    <div className={styles.subSection}>
      <div className={styles.subHead}>Photos</div>
      {images.map((slot, index) => (
        <LabelRow
          key={slot.name}
          reference={slot.name}
          value={slot.label}
          error={errors?.[`${pathPrefix}.${index}.label`]}
          onChange={(label) => onChange(replaceAt(images, index, { ...slot, label }))}
        />
      ))}
    </div>
  )
}

function TypeChoices({ options, errors, pathPrefix, onChange }) {
  return (
    <div className={styles.subSection}>
      <div className={styles.subHead}>ID types</div>
      <p className={styles.sectionHint}>
        The driver picks one, and the type decides which photos are needed.
      </p>
      {options.map((option, index) => (
        <div className={styles.fieldCard} key={option.id}>
          <LabelRow
            reference={option.id}
            value={option.label}
            error={errors?.[`${pathPrefix}.${index}.label`]}
            onChange={(label) => onChange(replaceAt(options, index, { ...option, label }))}
          />
          <div className={styles.slotList}>
            {option.images.map((slot, slotIndex) => (
              <LabelRow
                key={slot.name}
                reference={slot.name}
                kind="Photo"
                value={slot.label}
                      error={errors?.[`${pathPrefix}.${index}.images.${slotIndex}.label`]}
                onChange={(label) =>
                  onChange(
                    replaceAt(options, index, {
                      ...option,
                      images: replaceAt(option.images, slotIndex, { ...slot, label }),
                    }),
                  )
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** A whole number as typed, or undefined when the box is cleared. */
const toBound = (raw) => (raw === '' ? undefined : Number(raw))

/**
 * The bounds on a number field. The server refuses a value outside them when
 * the app saves the form, so a min above max would refuse everything.
 */
function NumberBounds({ field, errors, path, onChange }) {
  const crossed = field.min !== undefined && field.max !== undefined && field.min > field.max
  return (
    <div className={styles.rowFields}>
      <FormField label="Lowest accepted" hint={errors?.[`${path}.min`]}>
        <TextInput
          type="number"
          step={1}
          value={field.min ?? ''}
          aria-invalid={crossed || errors?.[`${path}.min`] ? 'true' : undefined}
          onChange={(event) => onChange({ ...field, min: toBound(event.target.value) })}
        />
      </FormField>
      <FormField
        label="Highest accepted"
        hint={errors?.[`${path}.max`] ?? (crossed ? 'Must not be below the lowest' : undefined)}
      >
        <TextInput
          type="number"
          step={1}
          value={field.max ?? ''}
          aria-invalid={crossed || errors?.[`${path}.max`] ? 'true' : undefined}
          onChange={(event) => onChange({ ...field, max: toBound(event.target.value) })}
        />
      </FormField>
    </div>
  )
}

function TypedDetails({ fields, errors, pathPrefix, onChange, title = 'Details they type in' }) {
  return (
    <div className={styles.subSection}>
      <div className={styles.subHead}>{title}</div>
      {fields.map((field, index) => {
        const path = `${pathPrefix}.${index}`
        const update = (next) => onChange(replaceAt(fields, index, next))
        return (
          <div className={styles.fieldCard} key={field.name}>
            <LabelRow
              reference={field.name}
              kind={`${FIELD_TYPE_LABELS[field.type] ?? field.type} · ${field.isMandatory ? 'Mandatory' : 'Optional'}`}
              value={field.label}
              error={errors?.[`${path}.label`]}
              onChange={(label) => update({ ...field, label })}
            />
            {field.type === 'number' && (
              <NumberBounds field={field} errors={errors} path={path} onChange={update} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** What a collapsed row holds, without opening it. */
function summarise(document) {
  const parts = []
  if (document.typeOptions?.length) {
    parts.push(`${document.typeOptions.length} ID types`)
  } else {
    // Named rather than counted, so the row reads like the tiles on the
    // driver's screen: "Front image · Back image".
    const labels = (document.images ?? []).map((slot) => slot.label || slot.name)
    parts.push(labels.length ? labels.join(' · ') : 'No photos')
  }
  const fields = document.fields?.length ?? 0
  if (fields) parts.push(fields === 1 ? '1 typed detail' : `${fields} typed details`)
  return parts.join(' · ')
}

/* The two screens that collect documents, matched by collectedAt. */
const GROUPS = [
  { key: 'identity', title: 'Identity & documents', blurb: 'Step 2 of sign-up.' },
  { key: 'vehicle', title: 'Vehicle documents', blurb: 'Step 3 of sign-up, below the vehicle details.' },
]

export function DocumentEditor({ documents, onChange, errors }) {
  // One open at a time. Seven documents expanded together is a wall of inputs
  // with no sight of the list they belong to.
  const [open, setOpen] = useState(null)

  const update = (index, next) => onChange(replaceAt(documents, index, next))

  // A document the server refused is opened, so the message is not hidden
  // inside a row that looks fine from the outside.
  const refused = (index) =>
    Object.keys(errors ?? {}).some((path) => path.startsWith(`documents.documents.${index}.`))

  const renderRow = (document, index) => {
    const isOpen = open === index || refused(index)
    const prefix = `documents.documents.${index}`

    return (
      <div className={`${styles.docCard} ${isOpen ? styles.docCardOpen : ''}`} key={document.name}>
        <button
          type="button"
          className={styles.docHead}
          aria-expanded={isOpen}
          onClick={() => setOpen(isOpen ? null : index)}
        >
          <span className={styles.docChevron}>
            {isOpen ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          </span>
          <span className={styles.docHeadText}>
            <span className={styles.docTitle}>{document.label || 'Untitled document'}</span>
            <span className={styles.docMeta}>
              <Ref>{document.name}</Ref> · {summarise(document)}
            </span>
          </span>
          <span className={document.isMandatory ? styles.pillRequired : styles.pillOptional}>
            {document.isMandatory ? 'Mandatory' : 'Optional'}
          </span>
        </button>

        {isOpen && (
          <div className={styles.docBody}>
            <FormField
              label="Name"
              hint={errors?.[`${prefix}.label`] ?? "Shown on the driver's Review screen and to reviewers"}
            >
              <TextInput
                value={document.label}
                placeholder="Driving licence"
                aria-invalid={errors?.[`${prefix}.label`] ? 'true' : undefined}
                onChange={(event) => update(index, { ...document, label: event.target.value })}
              />
            </FormField>

            {/*
              Editable, unlike the rest of the structure around it.
              GET /session carries isMandatory for every document, so the app
              reads this rather than deciding for itself — changing it here
              does reach the driver's phone, and the server's submit check
              agrees with what they were shown.
            */}
            <FormField
              label="Must the driver provide it"
              hint="Optional documents can be skipped without blocking Submit."
            >
              <div className={styles.choice} role="radiogroup" aria-label="Mandatory or optional">
                {[
                  { value: true, label: 'Mandatory' },
                  { value: false, label: 'Optional' },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="radio"
                    aria-checked={document.isMandatory === option.value}
                    className={`${styles.choiceBtn} ${
                      document.isMandatory === option.value ? styles.choiceOn : ''
                    }`}
                    onClick={() => update(index, { ...document, isMandatory: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FormField>

            {document.typeOptions?.length > 0 ? (
              <TypeChoices
                options={document.typeOptions}
                errors={errors}
                pathPrefix={`${prefix}.typeOptions`}
                onChange={(typeOptions) => update(index, { ...document, typeOptions })}
              />
            ) : (
              <Photos
                images={document.images ?? []}
                errors={errors}
                pathPrefix={`${prefix}.images`}
                onChange={(images) => update(index, { ...document, images })}
              />
            )}

            {document.fields?.length > 0 && (
              <TypedDetails
                fields={document.fields}
                errors={errors}
                pathPrefix={`${prefix}.fields`}
                onChange={(fields) => update(index, { ...document, fields })}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.groups}>
      {GROUPS.map((group) => {
        // Indices into the real array, so editing one does not depend on how
        // the screen chose to group them.
        const rows = documents
          .map((document, index) => ({ document, index }))
          .filter(({ document }) => document.collectedAt === group.key)

        return (
          <section className={styles.group} key={group.key}>
            <header className={styles.groupHead}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <p className={styles.groupBlurb}>{group.blurb}</p>
            </header>
            <div className={styles.docList}>
              {rows.length === 0 && (
                <p className={styles.sectionHint}>Nothing is asked for on this screen.</p>
              )}
              {rows.map(({ document, index }) => renderRow(document, index))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** The car's typed details: make, model, year, colour, plate. */
export function VehicleDetailsEditor({ fields, onChange, errors }) {
  return (
    <TypedDetails
      title="Fields"
      fields={fields}
      errors={errors}
      pathPrefix="documents.vehicleDetails.fields"
      onChange={onChange}
    />
  )
}
