import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  getApplications,
  getApplicationById,
  updateDocumentStatus as updateDocumentStatusRequest,
  updateApplicationStatus as updateApplicationStatusRequest,
} from '../services/api/driverApplicationsService'
import { useAuth } from '../features/auth/AuthContext'

const RealtimeContext = createContext(null)

/*
  App-wide provider for driver applications.

  This is the single in-memory store for applications: the Dashboard's
  "Pending Driver Applications" panel, the Drivers > Applications list, and
  the Application Review screen all read and mutate through this one
  provider, so every screen always agrees.
*/
export function RealtimeProvider({ children }) {
  /*
    This provider sits above the router, so it mounts on the sign-in screen
    too. Loading before there is a token would 401 — which the client treats
    as a lost session and signs the person out — so it waits.
  */
  const { isSignedIn } = useAuth()

  const [loaded, setLoaded] = useState([])
  const [loadError, setLoadError] = useState(null)
  /** Set once the load has come back, either way. */
  const [hasSettled, setHasSettled] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return undefined

    let cancelled = false

    getApplications()
      .then((data) => {
        if (cancelled) return
        setLoaded(data)
        setLoadError(null)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Unable to load driver applications.')
      })
      .finally(() => {
        if (cancelled) return
        setHasSettled(true)
      })

    return () => {
      cancelled = true
    }
  }, [isSignedIn])

  /*
    Derived rather than reset when the session goes, so nothing is written to
    state outside the load itself. Signed out there is nothing to show and
    nothing failed, because no call was made.
  */
  // Memoised so the empty case is one stable array, not a new one per render.
  const applications = useMemo(() => (isSignedIn ? loaded : []), [isSignedIn, loaded])
  const error = isSignedIn ? loadError : null
  const isLoading = isSignedIn && !hasSettled


  /**
   * Pulls one application's full detail into the store.
   *
   * The list call answers with a row per application and no documents in it —
   * seven documents each would be a lot to send for a table that shows a
   * count. The review screen needs them, so it asks for the one it is open on
   * and the row is replaced by the full version.
   */
  const loadApplication = useCallback((applicationId) => {
    return getApplicationById(applicationId).then((detail) => {
      setLoaded((current) => {
        const known = current.some((application) => application.id === applicationId)
        return known
          ? current.map((application) =>
              application.id === applicationId ? detail : application,
            )
          : [...current, detail]
      })
      return detail
    })
  }, [])

  const updateDocumentStatus = useCallback((applicationId, documentId, patch) => {
    return updateDocumentStatusRequest(applicationId, documentId, patch).then((updated) => {
      setLoaded((current) =>
        current.map((application) => (application.id === applicationId ? updated : application)),
      )
      return updated
    })
  }, [])

  const updateApplicationStatus = useCallback((applicationId, status, options) => {
    return updateApplicationStatusRequest(applicationId, status, options).then((updated) => {
      setLoaded((current) =>
        current.map((application) => (application.id === applicationId ? updated : application)),
      )
      return updated
    })
  }, [])

  const pendingCount = useMemo(
    // 'submitted' is the status the API gives an application nobody has
    // opened yet; 'in_review' is one somebody has.
    () =>
      applications.filter((application) =>
        ['submitted', 'in_review'].includes(application.status),
      ).length,
    [applications],
  )

  const value = useMemo(
    () => ({
      applications,
      pendingCount,
      isLoading,
      error,
      loadApplication,
      updateDocumentStatus,
      updateApplicationStatus,
    }),
    [
      applications,
      pendingCount,
      isLoading,
      error,
      loadApplication,
      updateDocumentStatus,
      updateApplicationStatus,
    ],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally colocated with its provider
export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return ctx
}
