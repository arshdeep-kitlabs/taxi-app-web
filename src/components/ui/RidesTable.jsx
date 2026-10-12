import { RideStatusBadge } from './StatusBadge'
import { LoadingState, EmptyState } from './States'
import { formatCurrency, formatDateTime } from '../../utils/formatters'

/** Shared ride-history table for driver and customer profiles. */
export function RidesTable({ rides, counterpartLabel, title = 'Recent Rides', subtitle }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">{title}</span>
          <div className="panel-header__subtitle">{subtitle}</div>
        </div>
      </div>

      {!rides && <LoadingState label="Loading rides…" />}
      {rides && rides.length === 0 && <EmptyState title="No rides yet" />}

      {rides && rides.length > 0 && (
        <div className="table-wrap table-wrap--flush">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ride ID</th>
                <th scope="col">Date</th>
                <th scope="col">{counterpartLabel}</th>
                <th scope="col">Fare</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id}>
                  <td className="table-cell-muted">{ride.id}</td>
                  <td className="table-cell-muted">{formatDateTime(ride.date)}</td>
                  <td>{ride.counterpart}</td>
                  <td>{formatCurrency(ride.fare)}</td>
                  <td>
                    <RideStatusBadge status={ride.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
