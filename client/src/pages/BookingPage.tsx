import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { TripTimeline } from '../components/TripCard'
import { Card, ErrorState, Field, ModeIcon, Spinner } from '../components/ui'
import { MODE_LABELS, buttonClass, inputClass } from '../lib/styles'
import { ApiError, api } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { User } from '../lib/types'

export function BookingPage() {
  const tripId = Number(useParams().id)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const trip = useQuery({ queryKey: ['trip', tripId], queryFn: () => api.getTrip(tripId) })

  const [seats, setSeats] = useState(() => Math.min(9, Math.max(1, Number(params.get('seats')) || 1)))
  const [email, setEmail] = useState('')
  const [traveller, setTraveller] = useState<User | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const identify = useMutation({
    mutationFn: async () => {
      if (needsProfile) return api.registerUser({ name, email, phone: phone || undefined })
      return api.lookupUser(email)
    },
    onSuccess: (user) => setTraveller(user),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) setNeedsProfile(true)
    },
  })

  const book = useMutation({
    mutationFn: () => api.book({ userId: traveller!.id, tripId, seats }),
    onSuccess: (reservation) => navigate(`/bookings/${reservation.id}`),
  })

  function onIdentify(event: FormEvent) {
    event.preventDefault()
    identify.mutate()
  }

  if (trip.isPending) return <Spinner label="Loading trip" />
  if (trip.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={trip.error.message} />
      </div>
    )
  }

  const t = trip.data
  const identifyError =
    identify.error && !(identify.error instanceof ApiError && identify.error.status === 404 && !needsProfile)
      ? identify.error.message
      : null

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <ModeIcon mode={t.mode} className="size-5 text-teal-700" />
            <p className="font-semibold">
              {t.operator} <span className="font-normal text-slate-500">· {MODE_LABELS[t.mode]} {t.code}</span>
            </p>
          </div>
          <TripTimeline trip={t} />
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <UserRound className="size-5 text-teal-700" /> Traveller
          </h2>
          {traveller ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-teal-50 p-4 text-sm">
              <span className="flex items-center gap-2 text-teal-900">
                <CheckCircle2 className="size-4" /> Booking as <strong>{traveller.name}</strong> ({traveller.email})
              </span>
              <button className="font-semibold text-teal-800 underline" onClick={() => setTraveller(null)}>
                Change
              </button>
            </div>
          ) : (
            <form onSubmit={onIdentify} className="mt-4 space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setNeedsProfile(false)
                  }}
                  placeholder="you@example.com"
                />
              </Field>
              {needsProfile && (
                <>
                  <p className="text-sm text-slate-600">New here? Add your details to create a traveller profile.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name">
                      <input required minLength={2} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <Field label="Phone (optional)">
                      <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98450 12345" />
                    </Field>
                  </div>
                </>
              )}
              {identifyError && <ErrorState message={identifyError} />}
              <button className={buttonClass} disabled={identify.isPending}>
                {identify.isPending ? 'Checking…' : needsProfile ? 'Create profile' : 'Continue'}
              </button>
            </form>
          )}
        </Card>
      </div>

      <Card className="h-fit p-6">
        <h2 className="font-semibold">Fare summary</h2>
        <Field label="Seats" hint={`${t.seatsAvailable} available`}>
          <input
            type="number"
            min={1}
            max={Math.min(9, t.seatsAvailable)}
            className={`${inputClass} mt-1`}
            value={seats}
            onChange={(e) => setSeats(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
          />
        </Field>
        <dl className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">
              {formatPrice(t.price)} × {seats}
            </dt>
            <dd>{formatPrice(t.price * seats)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPrice(t.price * seats)}</dd>
          </div>
        </dl>
        {book.isError && (
          <div className="mt-4">
            <ErrorState message={book.error.message} />
          </div>
        )}
        <button
          className={`${buttonClass} mt-5 w-full py-3`}
          disabled={!traveller || book.isPending || t.seatsAvailable === 0}
          onClick={() => book.mutate()}
        >
          {book.isPending ? 'Booking…' : t.seatsAvailable === 0 ? 'Sold out' : 'Confirm booking'}
        </button>
        {!traveller && <p className="mt-2 text-center text-xs text-slate-500">Add traveller details to continue.</p>}
        <Link
          to={`/trips?from=${encodeURIComponent(t.origin)}&to=${encodeURIComponent(t.destination)}`}
          className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-800"
        >
          Back to results
        </Link>
      </Card>
    </div>
  )
}
