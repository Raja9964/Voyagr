import { Link } from 'react-router'
import { formatDate, formatDuration, formatPrice, formatTime } from '../lib/format'
import type { Trip } from '../lib/types'
import { ModeIcon } from './ui'
import { MODE_LABELS, buttonClass } from '../lib/styles'

const MODE_TINT = {
  flight: 'bg-sky-50 text-sky-700',
  train: 'bg-amber-50 text-amber-700',
  bus: 'bg-violet-50 text-violet-700',
}

export function TripTimeline({ trip }: { trip: Trip }) {
  return (
    <div className="flex items-center gap-4">
      <div>
        <p className="text-xl font-bold tabular-nums">{formatTime(trip.departureTime)}</p>
        <p className="text-sm text-slate-500">{trip.origin}</p>
      </div>
      <div className="flex min-w-24 flex-1 flex-col items-center text-xs text-slate-500">
        <span>{formatDuration(trip.departureTime, trip.arrivalTime)}</span>
        <span className="my-1 h-px w-full bg-slate-300" />
        <span>{formatDate(trip.departureTime)}</span>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold tabular-nums">{formatTime(trip.arrivalTime)}</p>
        <p className="text-sm text-slate-500">{trip.destination}</p>
      </div>
    </div>
  )
}

export function TripCard({ trip, seats }: { trip: Trip; seats: number }) {
  const lowStock = trip.seatsAvailable <= 10
  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:grid-cols-[12rem_1fr_10rem] md:items-center">
      <div className="flex items-center gap-3">
        <span className={`rounded-xl p-2.5 ${MODE_TINT[trip.mode]}`}>
          <ModeIcon mode={trip.mode} />
        </span>
        <div>
          <p className="font-semibold">{trip.operator}</p>
          <p className="text-xs text-slate-500">
            {MODE_LABELS[trip.mode]} · {trip.code}
          </p>
        </div>
      </div>
      <TripTimeline trip={trip} />
      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
        <div className="md:text-right">
          <p className="text-xl font-bold">{formatPrice(trip.price)}</p>
          <p className={`text-xs ${lowStock ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
            {lowStock ? `Only ${trip.seatsAvailable} left` : `${trip.seatsAvailable} seats left`}
          </p>
        </div>
        <Link to={`/trips/${trip.id}/book?seats=${seats}`} className={buttonClass}>
          Select
        </Link>
      </div>
    </article>
  )
}
