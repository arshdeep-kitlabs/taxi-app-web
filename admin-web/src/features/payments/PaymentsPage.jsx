import { useEffect, useState } from 'react'
import { getTransactions, getPaymentSummary } from '../../services/api/paymentsService'
import { PaymentStatusBadge } from '../../components/ui/StatusBadge'
import { Badge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { PaymentsIcon, CloseIcon, PromotionsIcon, CheckIcon } from '../../components/icons'
import { formatCurrency, formatRate, formatDateTime } from '../../utils/formatters'
import styles from './PaymentsPage.module.css'

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'charge', label: 'Charges' },
  { value: 'refund', label: 'Refunds' },
  { value: 'adjustment', label: 'Adjustments' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
]

const TYPE_TONE = { charge: 'neutral', refund: 'info', adjustment: 'warning' }

export function PaymentsPage() {
  const [summary, setSummary] = useState(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [transactions, setTransactions] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPaymentSummary().then(setSummary)
  }, [])

  useEffect(() => {
    let cancelled = false
    getTransactions({ search, type, status })
      .then((data) => {
        if (cancelled) return
        setTransactions(data)
        setError(null)
      })
      .catch(() => !cancelled && setError('Unable to load transactions.'))
    return () => {
      cancelled = true
    }
  }, [search, type, status])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Payments</h1>
        <p className={styles.subtitle}>Transactions, failed payments, refunds, adjustments and reconciliation.</p>
      </div>

      {summary && (
        <div className={styles.statsRow}>
          <StatCard label="Total Processed" value={formatCurrency(summary.totalProcessed)} icon={PaymentsIcon} />
          <StatCard label="Failed Payments" value={summary.failedPayments} icon={CloseIcon} />
          <StatCard label="Refunds Issued" value={summary.refundsIssued} icon={PromotionsIcon} />
          <StatCard label="Pending Reconciliation" value={summary.pendingReconciliation} icon={CheckIcon} />
        </div>
      )}

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by transaction ID, ride ID or customer"
          ariaLabel="Search transactions"
        />
        <FilterSelect value={type} onChange={setType} options={TYPE_OPTIONS} ariaLabel="Filter by type" />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        {transactions && <ResultCount count={transactions.length} noun="transaction" />}
      </Toolbar>

      {!transactions && !error && <LoadingState label="Loading transactions…" />}
      {error && <ErrorState description={error} />}
      {transactions && transactions.length === 0 && (
        <EmptyState title="No transactions match your search" description="Try a different search term or clear the filters." />
      )}

      {transactions && transactions.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Transaction ID</th>
                <th scope="col">Ride ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Type</th>
                <th scope="col">Method</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Reconciled</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="table-cell-muted">{t.id}</td>
                  <td className="table-cell-muted">{t.rideId}</td>
                  <td>{t.customerName}</td>
                  <td>
                    <Badge tone={TYPE_TONE[t.type]}>{t.type}</Badge>
                  </td>
                  <td className="table-cell-muted">{t.method}</td>
                  <td>{formatRate(t.amount)}</td>
                  <td>
                    <PaymentStatusBadge status={t.status === 'succeeded' ? 'paid' : t.status} />
                  </td>
                  <td>
                    <Badge tone={t.reconciled ? 'success' : 'neutral'}>{t.reconciled ? 'Reconciled' : 'Pending'}</Badge>
                  </td>
                  <td className="table-cell-muted">{formatDateTime(t.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
