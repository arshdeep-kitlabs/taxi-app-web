import {
  storeGetTransactions,
  storeGetFinancialOverview,
  storeGetRevenueTimeSeries,
  storeGetFleetFinancialBreakdown,
  storeMarkTransactionStatus,
} from './fleetFinancialsStore'

const DELAY = 280
const delay = (ms = DELAY) => new Promise((r) => setTimeout(r, ms))

export const getTransactions           = async (opts)           => { await delay(); return storeGetTransactions(opts) }
export const getFinancialOverview      = async (fleetId)        => { await delay(); return storeGetFinancialOverview(fleetId) }
export const getRevenueTimeSeries      = async (fleetId)        => { await delay(); return storeGetRevenueTimeSeries(fleetId) }
export const getFleetFinancialBreakdown = async ()              => { await delay(); return storeGetFleetFinancialBreakdown() }
export const markTransactionStatus     = async (txnId, status)  => { await delay(350); return storeMarkTransactionStatus(txnId, status) }
