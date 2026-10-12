import { useMemo, useState } from 'react'
import { useRealtime } from '../../context/RealtimeContext'
import { ApplicationsTable } from '../../components/ui/ApplicationsTable'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { DriversSubNav } from './components/DriversSubNav'
import styles from './DriversPage.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Pending Review' },
  { value: 'in_review', label: 'In Review' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function DriverApplicationsListPage() {
  const { applications, isLoading, error } = useRealtime()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return applications
      .filter((application) => status === 'all' || application.status === status)
      .filter(
        (application) =>
          query.length === 0 ||
          (application.driverName ?? '').toLowerCase().includes(query) ||
          (application.applicationId ?? '').toLowerCase().includes(query) ||
          application.id.toLowerCase().includes(query),
      )
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  }, [applications, search, status])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Drivers</h1>
        <p className={styles.subtitle}>Every submitted driver application, newest first.</p>
      </div>

      <DriversSubNav />

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by driver name or application ID"
          ariaLabel="Search applications"
        />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        <ResultCount count={filtered.length} noun="application" />
      </Toolbar>

      {isLoading && <LoadingState label="Loading applications…" />}
      {!isLoading && error && <ErrorState description={error} />}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          title="No applications match your search"
          description="Try a different name, ID, or clear the status filter."
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="table-wrap">
          <ApplicationsTable applications={filtered} />
        </div>
      )}
    </div>
  )
}
