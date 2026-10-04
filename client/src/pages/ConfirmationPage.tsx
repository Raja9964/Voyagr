import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { TripTimeline } from '../components/TripCard'
import { Card, ErrorState, Spinner } from '../components/ui'
import { buttonClass } from '../lib/styles'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'

export function ConfirmationPage() {
  const id = Number(useParams().id)
  const reservation = useQuery({ queryKey: ['reservation', id], queryFn: () => api.getReservation(id) })

  if (reservation.isPending) return <Spinner label="Loading booking" />
  if (reservation.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <ErrorState message={reservation.error.message} />
      </div>
    )
  }

  const r = reservation.data
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-teal-600" />
        <h1 className="mt-3 text-2xl font-bold">You're booked!</h1>
        <p className="mt-1 text-slate-500">Reservation #{r.id}</p>
      </div>
      <Card className="p-6">
        <p className="mb-4 font-semibold">
          {r.trip.operator} <span className="font-normal text-slate-500">· {r.trip.code}</span>
        </p>
        <TripTimeline trip={r.trip} />
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm">
          <div>
            <dt className="text-slate-500">Seats</dt>
            <dd className="font-semibold">{r.seats}</dd>
          </div>
          <div className="text-right">
            <dt className="text-slate-500">Total paid</dt>
            <dd className="font-semibold">{formatPrice(r.totalPrice)}</dd>
          </div>
        </dl>
      </Card>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/my-trips" className={buttonClass}>
          View my trips
        </Link>
        <Link to="/" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
          Book another
        </Link>
      </div>
    </div>
  )
}
