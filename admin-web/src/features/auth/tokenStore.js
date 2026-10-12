/*
  Where the admin token lives between page loads.

  localStorage rather than a cookie, because the API is on another origin and
  is not issuing cookies for it. The trade-off is the usual one: a token here
  is readable by any script that manages to run on this page, so it is kept
  short-lived (8 hours) server-side rather than being made revocable, which
  nothing currently is.

  Every accessor is wrapped: Safari's private mode throws on write, and a
  storage failure should sign someone out, not crash the panel.
*/

const TOKEN_KEY = 'nomad.admin.token'

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function writeToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Not fatal: the session still works until this tab is closed.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to do — the token is already unreachable.
  }
}
