import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { TripTimeline } from '../components/TripCard'
import { Card, EmptyState, ErrorState, ModeIcon, Spinner } from '../components/ui'
import { buttonClass, inputClass } from '../lib/styles'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { Reservation } from '../lib/types'

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => api.cancel(reservation.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations', reservation.userId] }),
  })
  const [loadedAt] = useState(() => Date.now())
  const upcoming = Date.parse(reservation.trip.departureTime) > loadedAt
  const cancelled = reservation.status === 'cancelled'

  function onCancel() {
    if (window.confirm(`Cancel reservation #${reservation.id}? The seats will be released.`)) cancel.mutate()
  }

  return (
    <Card className={`p-5 ${cancelled ? 'opacity-70' : ''}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <ModeIcon mode={reservation.trip.mode} className="size-4 text-teal-700" />
          {reservation.trip.operator}
          <span className="font-normal text-slate-500">· {reservation.trip.code} · #{reservation.id}</span>
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            cancelled ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {cancelled ? 'Cancelled' : 'Confirmed'}
        </span>
      </div>
      <TripTimeline trip={reservation.trip} />
      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
        <span className="text-slate-600">
          {reservation.seats} {reservation.seats === 1 ? 'seat' : 'seats'} · {formatPrice(reservation.totalPrice)}
        </span>
        {!cancelled && upcoming && (
          <button
            onClick={onCancel}
            disabled={cancel.isPending}
            className="rounded-lg border border-rose-200 px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>
      {cancel.isError && (
        <div className="mt-3">
          <ErrorState message={cancel.error.message} />
        </div>
      )}
    </Card>
  )
}

export function MyTripsPage() {
  const [params, setParams] = useSearchParams()
  const email = params.get('email') ?? ''
  const [input, setInput] = useState(email)

  const user = useQuery({ queryKey: ['user', email], queryFn: () => api.lookupUser(email), enabled: Boolean(email), retry: false })
  const reservations = useQuery({
    queryKey: ['reservations', user.data?.id],
    queryFn: () => api.listReservations(user.data!.id),
    enabled: Boolean(user.data),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setParams(input ? { email: input.trim() } : {})
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">My trips</h1>
      <p className="mt-1 text-sm text-slate-500">Enter the email you booked with to see and manage your reservations.</p>
      <form onSubmit={onSubmit} className="mt-5 flex gap-2">
        <input type="email" required className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="you@example.com" aria-label="Email" />
        <button className={buttonClass}>
          <Search className="size-4" /> Find
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {(user.isFetching || reservations.isPending) && user.fetchStatus !== 'idle' && <Spinner label="Looking up your trips" />}
        {user.isError && <ErrorState message={user.error.message} />}
        {reservations.isError && <ErrorState message={reservations.error.message} onRetry={() => reservations.refetch()} />}
        {user.data && reservations.data && (
          <>
            <p className="text-sm text-slate-600">
              Signed in as <strong>{user.data.name}</strong>
            </p>
            {reservations.data.length === 0 ? (
              <EmptyState title="No reservations yet">
                <Link to="/" className="font-semibold text-teal-700 underline">
                  Search for a trip
                </Link>
              </EmptyState>
            ) : (
              reservations.data.map((r) => <ReservationCard key={r.id} reservation={r} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}
