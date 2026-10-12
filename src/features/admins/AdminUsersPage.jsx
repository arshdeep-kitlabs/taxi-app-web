import { useEffect, useState } from 'react'
import { getAdminUsers, setAdminUserStatus } from '../../services/api/authService'
import { useAuth } from '../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/States'
import styles from './AdminUsersPage.module.css'

/*
  Who may sign in to this dashboard.

  There are no roles yet — every active admin can do everything — so this is
  only about who is let in. People sign themselves up at /signup and land here
  as pending until somebody already in approves them.
*/

const STATUS_TONE = {
  active: 'success',
  pending: 'warning',
  suspended: 'neutral',
  rejected: 'danger',
}

const STATUS_LABEL = {
  active: 'Active',
  pending: 'Pending approval',
  suspended: 'Suspended',
  rejected: 'Rejected',
}

export function AdminUsersPage() {
  const { admin: currentAdmin } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)
  /* The row a request is in flight for, so only its own buttons go quiet. */
  const [busyId, setBusyId] = useState(null)

  function refresh() {
    getAdminUsers()
      .then(setUsers)
      .catch((failure) => setError(failure.message))
  }
  useEffect(refresh, [])

  async function change(userId, status) {
    setBusyId(userId)
    setError(null)
    try {
      await setAdminUserStatus(userId, status)
      refresh()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = users?.filter((user) => user.status === 'pending').length ?? 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Users</h1>
        <p className={styles.subtitle}>
          Everyone with access to this dashboard. New people sign up at <code>/signup</code> and
          wait here for approval.
          {pendingCount > 0 && ` ${pendingCount} waiting.`}
        </p>
      </div>

      {error && (
        <ErrorState title="Could not update that account" description={error} onRetry={refresh} />
      )}

      <div className="panel">
        {!users ? (
          <LoadingState label="Loading…" />
        ) : (
          <div className="table-wrap table-wrap--flush">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last signed in</th>
                  <th scope="col" className="visually-hidden">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentAdmin?.id
                  const busy = busyId === user.id
                  return (
                    <tr key={user.id}>
                      <td>
                        {user.name}
                        {isSelf && <span className="table-cell-muted"> (you)</span>}
                      </td>
                      <td className="table-cell-muted">{user.email}</td>
                      <td>
                        <Badge tone={STATUS_TONE[user.status] ?? 'neutral'}>
                          {STATUS_LABEL[user.status] ?? user.status}
                        </Badge>
                      </td>
                      <td className="table-cell-muted">{user.lastLoginAt ?? 'Never'}</td>
                      <td>
                        {user.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              disabled={busy}
                              onClick={() => change(user.id, 'active')}
                            >
                              Approve
                            </button>{' '}
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              disabled={busy}
                              onClick={() => change(user.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          /*
                            An admin cannot stand themselves down — the API
                            refuses it — so the button is not offered either.
                          */
                          !isSelf && (
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              disabled={busy}
                              onClick={() =>
                                change(user.id, user.status === 'active' ? 'suspended' : 'active')
                              }
                            >
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
