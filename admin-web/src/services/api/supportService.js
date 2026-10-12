import { tickets as initialTickets, ADMIN_USERS } from '../mock/supportMock'
import { recordAuditLog } from '../audit/auditLog'

const MOCK_LATENCY_MS = 350
let tickets = initialTickets
let messageSeq = 100
let noteSeq = 100

function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

export { ADMIN_USERS }

export function getTickets({ search = '', status = 'all' } = {}) {
  const query = search.trim().toLowerCase()
  const filtered = tickets
    .filter((t) => status === 'all' || t.status === status)
    .filter(
      (t) =>
        query.length === 0 ||
        t.id.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.requesterName.toLowerCase().includes(query),
    )
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  return resolveAfterDelay(filtered)
}

export function getTicketById(ticketId) {
  return resolveAfterDelay(tickets.find((t) => t.id === ticketId) ?? null)
}

function updateTicket(ticketId, patch) {
  tickets = tickets.map((t) => (t.id === ticketId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t))
  return resolveAfterDelay(tickets.find((t) => t.id === ticketId))
}

export function setTicketAssignee(ticketId, assignedTo) {
  return updateTicket(ticketId, { assignedTo: assignedTo || null, status: 'in_progress' })
}

export function addTicketMessage(ticketId, body) {
  messageSeq += 1
  const message = { id: `MSG-${messageSeq}`, authorType: 'admin', author: 'Vipin Kumar', body, timestamp: new Date().toISOString() }
  const ticket = tickets.find((t) => t.id === ticketId)
  return updateTicket(ticketId, { messages: [...ticket.messages, message] })
}

export function addInternalNote(ticketId, body) {
  noteSeq += 1
  const note = { id: `N-${noteSeq}`, author: 'Vipin Kumar', body, timestamp: new Date().toISOString() }
  const ticket = tickets.find((t) => t.id === ticketId)
  return updateTicket(ticketId, { internalNotes: [...ticket.internalNotes, note] })
}

export function resolveTicket(ticketId, summary) {
  const before = tickets.find((t) => t.id === ticketId)
  const result = updateTicket(ticketId, {
    status: 'resolved',
    resolution: { resolvedBy: 'Vipin Kumar', resolvedAt: new Date().toISOString(), summary },
  })
  if (before) {
    recordAuditLog({
      action: 'Resolved support ticket',
      entityType: 'Support Ticket',
      entityLabel: `${ticketId} · ${before.subject}`,
      before: before.status,
      after: 'resolved',
    })
  }
  return result
}
