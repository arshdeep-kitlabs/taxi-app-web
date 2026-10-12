import { apiClient } from './client'

/*
  Admin sign-in.

  The only service that talks to /admin/signup, /admin/login and /admin/me.
  Everything else assumes a token is already in place — the client attaches it.
*/

export async function login({ email, password }) {
  const res = await apiClient.post('/admin/login', { email, password })
  return res.data
}

export async function signup({ name, email, password }) {
  const res = await apiClient.post('/admin/signup', { name, email, password })
  return res.data
}

/** The account behind the stored token, or a 401 if it is no longer good. */
export async function fetchMe() {
  const res = await apiClient.get('/admin/me')
  return res.data
}

/** Every staff account, pending ones first. */
export async function getAdminUsers() {
  const res = await apiClient.get('/admin/users')
  return res.data.rows
}

/** Approve, suspend or reject an account. */
export async function setAdminUserStatus(adminId, status) {
  const res = await apiClient.patch(`/admin/users/${adminId}`, { status })
  return res.data
}
