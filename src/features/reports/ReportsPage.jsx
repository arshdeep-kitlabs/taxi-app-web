import { useEffect, useState } from 'react'
import {
  getRidesReport,
  getRevenueReport,
  getCancellationsReport,
  getDriverPerformanceReport,
  getCustomerActivityReport,
  getSupportReport,
  getPaymentSummaryReport,
} from '../../services/api/reportsService'
import { StatCard } from '../../components/ui/StatCard'
import { LoadingState } from '../../components/ui/States'
import { RidesIcon, PaymentsIcon, CloseIcon, DriversIcon, CustomersIcon, SupportIcon, ReportsIcon, ClockIcon } from '../../components/icons'
import { formatCurrency, formatRate, formatNumber } from '../../utils/formatters'
import styles from './ReportsPage.module.css'

const TABS = [
  { key: 'rides', label: 'Rides', icon: RidesIcon, load: getRidesReport },
  { key: 'revenue', label: 'Revenue', icon: PaymentsIcon, load: getRevenueReport },
  { key: 'cancellations', label: 'Cancellations', icon: CloseIcon, load: getCancellationsReport },
  { key: 'drivers', label: 'Driver Performance', icon: DriversIcon, load: getDriverPerformanceReport },
  { key: 'customers', label: 'Customer Activity', icon: CustomersIcon, load: getCustomerActivityReport },
  { key: 'support', label: 'Support', icon: SupportIcon, load: getSupportReport },
  { key: 'payments', label: 'Payment Summaries', icon: ReportsIcon, load: getPaymentSummaryReport },
]

function RidesReport({ data }) {
  return (
    <>
      <div className={styles.statsRow}>
        <StatCard label="Total Rides" value={formatNumber(data.total)} icon={RidesIcon} />
        <StatCard label="Completed" value={formatNumber(data.completed)} icon={RidesIcon} />
        <StatCard label="Cancelled" value={formatNumber(data.cancelled)} icon={CloseIcon} />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">City</th><th scope="col">Total</th><th scope="col">Completed</th><th scope="col">Cancelled</th></tr></thead>
          <tbody>
            {data.byCity.map((row) => (
              <tr key={row.city}><td>{row.city}</td><td>{row.total}</td><td>{row.completed}</td><td>{row.cancelled}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function RevenueReport({ data }) {
  return (
    <>
      <div className={styles.statsRow}>
        <StatCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} icon={PaymentsIcon} />
        <StatCard label="Completed Rides" value={formatNumber(data.completedRides)} icon={RidesIcon} />
        <StatCard label="Average Fare" value={formatRate(data.averageFare)} icon={PaymentsIcon} />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">City</th><th scope="col">Rides</th><th scope="col">Revenue</th></tr></thead>
          <tbody>
            {data.byCity.map((row) => (
              <tr key={row.city}><td>{row.city}</td><td>{row.rides}</td><td>{formatRate(row.revenue)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function CancellationsReport({ data }) {
  return (
    <>
      <div className={styles.statsRow}>
        <StatCard label="Total Cancelled" value={formatNumber(data.total)} icon={CloseIcon} />
        <StatCard label="Cancellation Rate" value={`${(data.rate * 100).toFixed(1)}%`} icon={CloseIcon} />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Ride ID</th><th scope="col">City</th><th scope="col">Cancelled By</th><th scope="col">Reason</th></tr></thead>
          <tbody>
            {data.rides.map((ride) => (
              <tr key={ride.id}>
                <td className="table-cell-muted">{ride.id}</td>
                <td>{ride.city}</td>
                <td className="table-cell-muted">{ride.cancelledBy}</td>
                <td>{ride.cancellationReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function DriverPerformanceReport({ data }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th scope="col">Driver</th><th scope="col">Completed</th><th scope="col">Cancelled</th><th scope="col">Rating</th><th scope="col">Earnings</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td><td>{formatNumber(d.completedRides)}</td><td>{formatNumber(d.cancelledRides)}</td>
              <td>{d.rating.toFixed(2)}</td><td>{formatCurrency(d.earningsTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CustomerActivityReport({ data }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th scope="col">Customer</th><th scope="col">Total Rides</th><th scope="col">Completed</th><th scope="col">Cancelled</th><th scope="col">Total Spend</th></tr></thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td><td>{formatNumber(c.totalRides)}</td><td>{formatNumber(c.completedRides)}</td>
              <td>{formatNumber(c.cancelledRides)}</td><td>{formatCurrency(c.totalSpend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentSummaryReport({ data }) {
  const { summary, byType } = data
  return (
    <>
      <div className={styles.statsRow}>
        <StatCard label="Total Processed" value={formatCurrency(summary.totalProcessed)} icon={PaymentsIcon} />
        <StatCard label="Failed Payments" value={summary.failedPayments} icon={CloseIcon} />
        <StatCard label="Refunds Issued" value={summary.refundsIssued} icon={PaymentsIcon} />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Type</th><th scope="col">Count</th><th scope="col">Total Amount</th></tr></thead>
          <tbody>
            {byType.map((row) => (
              <tr key={row.type}><td>{row.type}</td><td>{row.count}</td><td>{formatRate(row.total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SupportReport({ data }) {
  return (
    <>
      <div className={styles.statsRow}>
        <StatCard label="Total Tickets" value={formatNumber(data.total)} icon={SupportIcon} />
        <StatCard label="Open" value={formatNumber(data.open)} icon={SupportIcon} />
        <StatCard
          label="Avg. Resolution Time"
          value={data.resolved > 0 ? `${data.avgResolutionHours.toFixed(1)}h` : '—'}
          icon={ClockIcon}
        />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Assigned To</th>
              <th scope="col">Total</th>
              <th scope="col">Open</th>
              <th scope="col">In Progress</th>
              <th scope="col">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {data.byAssignee.map((row) => (
              <tr key={row.assignee}>
                <td>{row.assignee}</td>
                <td>{row.total}</td>
                <td>{row.open}</td>
                <td>{row.inProgress}</td>
                <td>{row.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const REPORT_VIEWS = {
  rides: RidesReport,
  revenue: RevenueReport,
  cancellations: CancellationsReport,
  drivers: DriverPerformanceReport,
  customers: CustomerActivityReport,
  support: SupportReport,
  payments: PaymentSummaryReport,
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('rides')
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    const tab = TABS.find((t) => t.key === activeTab)
    tab.load().then((result) => {
      if (!cancelled) setData(result)
    })
    return () => {
      cancelled = true
    }
  }, [activeTab])

  const ReportView = REPORT_VIEWS[activeTab]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reports</h1>
        <p className={styles.subtitle}>Rides, revenue, cancellations, driver performance, customer activity, support and payment summaries.</p>
      </div>

      <nav className={styles.tabs} aria-label="Report type">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => {
              setData(null)
              setActiveTab(tab.key)
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {!data ? <LoadingState label="Loading report…" /> : <ReportView data={data} />}
    </div>
  )
}
