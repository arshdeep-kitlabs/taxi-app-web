import { useEffect, useState } from 'react'
import { getAuditLogs, getAuditLogFilterOptions } from '../../services/api/auditLogsService'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { formatDateTime } from '../../utils/formatters'
import styles from './AuditLogsPage.module.css'

function formatValue(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [entityType, setEntityType] = useState('all')
  const [actor, setActor] = useState('all')
  const [filterOptions, setFilterOptions] = useState(null)
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAuditLogFilterOptions().then(setFilterOptions)
  }, [])

  useEffect(() => {
    let cancelled = false
    getAuditLogs({ search, entityType, actor })
      .then((data) => {
        if (cancelled) return
        setEntries(data)
        setError(null)
      })
      .catch(() => !cancelled && setError('Unable to load audit logs.'))
    return () => {
      cancelled = true
    }
  }, [search, entityType, actor])

  const entityTypeOptions = [
    { value: 'all', label: 'All entity types' },
    ...(filterOptions?.entityTypes.map((t) => ({ value: t, label: t })) ?? []),
  ]
  const actorOptions = [
    { value: 'all', label: 'All admins' },
    ...(filterOptions?.actors.map((a) => ({ value: a, label: a })) ?? []),
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Audit Logs</h1>
        <p className={styles.subtitle}>Sensitive admin actions across the platform — actor, timestamp, action and entity affected.</p>
      </div>

      <Toolbar>
        <SearchField value={search} onChange={setSearch} placeholder="Search by admin, action or entity" ariaLabel="Search audit logs" />
        <FilterSelect value={entityType} onChange={setEntityType} options={entityTypeOptions} ariaLabel="Filter by entity type" />
        <FilterSelect value={actor} onChange={setActor} options={actorOptions} ariaLabel="Filter by admin" />
        {entries && <ResultCount count={entries.length} noun="entry" />}
      </Toolbar>

      {!entries && !error && <LoadingState label="Loading audit logs…" />}
      {error && <ErrorState description={error} />}
      {entries && entries.length === 0 && (
        <EmptyState title="No audit log entries match your search" description="Try a different search term or clear the filters." />
      )}

      {entries && entries.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Admin</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Before → After</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="table-cell-muted">{formatDateTime(entry.timestamp)}</td>
                  <td>{entry.actor}</td>
                  <td>{entry.action}</td>
                  <td>
                    {entry.entityLabel}
                    <br />
                    <span className={styles.entityType}>{entry.entityType}</span>
                  </td>
                  <td className={styles.change}>
                    {formatValue(entry.before)} → {formatValue(entry.after)}
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
