import { transactions } from '../mock/paymentsMock'

const MOCK_LATENCY_MS = 350
function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

export function getTransactions({ search = '', type = 'all', status = 'all' } = {}) {
  const query = search.trim().toLowerCase()
  const filtered = transactions
    .filter((t) => type === 'all' || t.type === type)
    .filter((t) => status === 'all' || t.status === status)
    .filter(
      (t) =>
        query.length === 0 ||
        t.id.toLowerCase().includes(query) ||
        t.rideId.toLowerCase().includes(query) ||
        t.customerName.toLowerCase().includes(query),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  return resolveAfterDelay(filtered)
}

export function getPaymentSummary() {
  const succeededCharges = transactions.filter((t) => t.type === 'charge' && t.status === 'succeeded')
  const summary = {
    totalProcessed: succeededCharges.reduce((sum, t) => sum + t.amount, 0),
    failedPayments: transactions.filter((t) => t.status === 'failed').length,
    refundsIssued: transactions.filter((t) => t.type === 'refund' && t.status === 'succeeded').length,
    pendingReconciliation: transactions.filter((t) => !t.reconciled).length,
  }
  return resolveAfterDelay(summary)
}
