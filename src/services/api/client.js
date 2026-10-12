/*
  Thin HTTP client wrapper.

  Every call carries the admin token from the token store, so no caller has to
  remember to attach it. A 401 means the token is gone, expired, or belongs to
  an account that has since been suspended — the client clears it and hands
  control to the listener the auth context registers, which sends the person
  back to the sign-in screen.
*/

import { clearToken, readToken } from '../../features/auth/tokenStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
    /** The stable code to switch on. The message is for a human reading a log. */
    this.code = payload?.error?.code ?? null
    /** Per-field codes, when the API rejected the form rather than the request. */
    this.fields = payload?.error?.fields ?? null
  }
}

/*
  Set by the auth context. Kept as a module-level hook rather than a React
  import so this file stays free of React — it is imported by plain services
  that run outside any component.
*/
let onUnauthorized = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

/** Endpoints that are reachable without a token, and must not trigger a sign-out. */
const PUBLIC_PATHS = ['/admin/login', '/admin/signup']

async function request(path, { method = 'GET', body, headers, signal } = {}) {
  const token = readToken()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!response.ok) {
    let payload
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    // A failed sign-in is not a lost session — it is an answer to a form.
    if (response.status === 401 && !PUBLIC_PATHS.includes(path)) {
      clearToken()
      onUnauthorized?.()
    }

    throw new ApiError(
      payload?.error?.message ?? payload?.message ?? response.statusText,
      response.status,
      payload,
    )
  }

  if (response.status === 204) return null
  return response.json()
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

export { ApiError }
