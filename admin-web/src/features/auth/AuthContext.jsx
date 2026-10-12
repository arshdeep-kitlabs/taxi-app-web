import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setUnauthorizedHandler } from '../../services/api/client'
import * as authService from '../../services/api/authService'
import { clearToken, readToken, writeToken } from './tokenStore'

/*
  Who is signed in, for the whole panel.

  The token in localStorage is the claim; /admin/me is the proof. On every
  load the stored token is checked against the API before anything renders,
  so a token that was revoked — or belongs to an account suspended since —
  never reaches a page that assumes a valid session.
*/

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  /*
    'checking' until the stored token has been verified. Routes must wait for
    this: rendering the sign-in screen first would bounce a signed-in person
    out of a deep link on every refresh.
  */
  const [state, setState] = useState(readToken() ? 'checking' : 'signed-out')

  const signOut = useCallback(() => {
    clearToken()
    setAdmin(null)
    setState('signed-out')
  }, [])

  // The client calls this when any request comes back 401.
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // Verify a stored token once, on load.
  useEffect(() => {
    if (state !== 'checking') return

    let cancelled = false
    authService
      .fetchMe()
      .then((me) => {
        if (cancelled) return
        setAdmin(me)
        setState('signed-in')
      })
      .catch(() => {
        // The 401 path already cleared the token; anything else (the API being
        // down, say) is still not a session we can act on.
        if (!cancelled) signOut()
      })

    return () => {
      cancelled = true
    }
  }, [state, signOut])

  const signIn = useCallback(async (credentials) => {
    const session = await authService.login(credentials)
    writeToken(session.token)
    setAdmin(session.admin)
    setState('signed-in')
    return session
  }, [])

  /*
    Signing up does not sign anyone in: a new account is pending until an
    existing admin approves it. The one exception is the first account on a
    fresh install, which the API activates because there is nobody to approve
    it — `activated` says which happened.
  */
  const signUp = useCallback(
    async (details) => {
      const result = await authService.signup(details)
      if (result.activated) {
        await signIn({ email: details.email, password: details.password })
      }
      return result
    },
    [signIn],
  )

  const value = useMemo(
    () => ({
      admin,
      status: state,
      isSignedIn: state === 'signed-in',
      isChecking: state === 'checking',
      signIn,
      signUp,
      signOut,
    }),
    [admin, state, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>.')
  return context
}
