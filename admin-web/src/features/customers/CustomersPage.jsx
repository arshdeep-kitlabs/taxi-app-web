import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers } from '../../services/api/customersService'
import { CustomerStatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { getInitials, formatNumber, formatCurrency, formatDateTime } from '../../utils/formatters'
import styles from './CustomersPage.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blocked', label: 'Blocked' },
]

export function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [customers, setCustomers] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCustomers({ search, status })
      .then((data) => {
        if (cancelled) return
        setCustomers(data)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load customers.')
      })
    return () => {
      cancelled = true
    }
  }, [search, status])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customers</h1>
        <p className={styles.subtitle}>Search customers, manage profiles and review activity.</p>
      </div>

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by name, ID, email or phone"
          ariaLabel="Search customers"
        />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        {customers && <ResultCount count={customers.length} noun="customer" />}
      </Toolbar>

      {!customers && !error && <LoadingState label="Loading customers…" />}
      {error && <ErrorState description={error} />}

      {customers && customers.length === 0 && (
        <EmptyState title="No customers match your search" description="Try a different name, ID, or clear the status filter." />
      )}

      {customers && customers.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Contact</th>
                <th scope="col">City</th>
                <th scope="col">Total Rides</th>
                <th scope="col">Total Spend</th>
                <th scope="col">Joined</th>
                <th scope="col">Status</th>
                <th scope="col" className="visually-hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className={styles.customerCell}>
                      <span className={styles.avatar}>{getInitials(customer.name)}</span>
                      <div>
                        <div className={styles.customerName}>{customer.name}</div>
                        <div className={styles.customerId}>{customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell-muted">
                    {customer.email}
                    <br />
                    {customer.phone}
                  </td>
                  <td className="table-cell-muted">{customer.city}</td>
                  <td>{formatNumber(customer.totalRides)}</td>
                  <td>{formatCurrency(customer.totalSpend)}</td>
                  <td className="table-cell-muted">{formatDateTime(customer.joinedAt)}</td>
                  <td>
                    <CustomerStatusBadge status={customer.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
