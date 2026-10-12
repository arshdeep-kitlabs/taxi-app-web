import { useEffect, useState } from 'react'
import { getPromotions, getPromoStatus, createPromotion, updatePromotion, setPromotionActive } from '../../services/api/promotionsService'
import { PromoStatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { formatDateTime } from '../../utils/formatters'
import { PromoFormModal } from './PromoFormModal'
import styles from './PromotionsPage.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'expired', label: 'Expired' },
  { value: 'exhausted', label: 'Exhausted' },
  { value: 'disabled', label: 'Disabled' },
]

const ELIGIBILITY_LABEL = { all: 'All customers', new_customers: 'New customers', city: 'City' }

function formatDiscount(promo) {
  return promo.discountType === 'percentage' ? `${promo.discountValue}%` : `$${promo.discountValue.toFixed(2)}`
}

export function PromotionsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [promotions, setPromotions] = useState(null)
  const [error, setError] = useState(null)
  const [editingPromo, setEditingPromo] = useState(null) // null | {} (create) | promo (edit)

  function refresh() {
    getPromotions({ search, status })
      .then((data) => {
        setPromotions(data)
        setError(null)
      })
      .catch(() => setError('Unable to load promotions.'))
  }

  useEffect(refresh, [search, status])

  function handleSave(data) {
    const request = editingPromo?.id ? updatePromotion(editingPromo.id, data) : createPromotion(data)
    request.then(() => {
      setEditingPromo(null)
      refresh()
    })
  }

  function handleToggleActive(promo) {
    setPromotionActive(promo.id, !promo.active).then(refresh)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Promotions</h1>
          <p className={styles.subtitle}>Create and manage promo codes — validity, usage limits, eligibility and discounts.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditingPromo({})}>
          Create Promo Code
        </button>
      </div>

      <Toolbar>
        <SearchField value={search} onChange={setSearch} placeholder="Search by promo code" ariaLabel="Search promotions" />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        {promotions && <ResultCount count={promotions.length} noun="promo code" />}
      </Toolbar>

      {!promotions && !error && <LoadingState label="Loading promotions…" />}
      {error && <ErrorState description={error} />}
      {promotions && promotions.length === 0 && (
        <EmptyState title="No promo codes match your search" description="Try a different search term or clear the status filter." />
      )}

      {promotions && promotions.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Discount</th>
                <th scope="col">Eligibility</th>
                <th scope="col">Valid</th>
                <th scope="col">Usage</th>
                <th scope="col">Status</th>
                <th scope="col" className="visually-hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => (
                <tr key={promo.id}>
                  <td>{promo.code}</td>
                  <td>{formatDiscount(promo)}</td>
                  <td className={styles.eligibility}>
                    {ELIGIBILITY_LABEL[promo.eligibility]}
                    {promo.city ? ` · ${promo.city}` : ''}
                  </td>
                  <td className="table-cell-muted">
                    {formatDateTime(promo.validFrom)} – {formatDateTime(promo.validUntil)}
                  </td>
                  <td>
                    {promo.usageCount}/{promo.usageLimit}
                  </td>
                  <td>
                    <PromoStatusBadge status={getPromoStatus(promo)} />
                  </td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingPromo(promo)}>
                      Edit
                    </button>{' '}
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => handleToggleActive(promo)}>
                      {promo.active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPromo && (
        <PromoFormModal
          promo={editingPromo.id ? editingPromo : null}
          onCancel={() => setEditingPromo(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
