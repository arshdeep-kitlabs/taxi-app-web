import { apiClient } from './client'
import { recordAuditLog } from '../audit/auditLog'

/*
  The app's own configuration — the document the driver app reads on launch.

  This is the real thing, not a copy: what is saved here is what GET /config
  serves, within a second and without a deploy. Which is also why it is saved
  whole rather than field by field. A partial save has no answer for a removed
  country or a reordered document list, so the screen holds the document it
  loaded and sends it back entire.
*/

export async function getAppConfig() {
  const response = await apiClient.get('/admin/config')
  return response.data
}

export async function saveAppConfig(config) {
  const response = await apiClient.put('/admin/config', config)
  recordAuditLog({
    action: 'Updated app configuration',
    entityType: 'Configuration',
    entityLabel: config?.branding?.appName ?? 'App config',
  })
  return response.data
}
