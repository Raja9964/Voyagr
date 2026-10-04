import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { SearchForm } from '../components/SearchForm'
import { TripCard } from '../components/TripCard'
import { EmptyState, ErrorState, ModeIcon, Spinner } from '../components/ui'
import { MODE_LABELS, inputClass } from '../lib/styles'
import { api } from '../lib/api'
import type { TravelMode, TripSort } from '../lib/types'

const MODES: TravelMode[] = ['flight', 'train', 'bus']
const PRICE_CAPS = [0, 1000, 2500, 5000]

export function ResultsPage() {
  const [params, setParams] = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const date = params.get('date') ?? ''
  const seats = Number(params.get('seats')) || 1
  const modes = (params.get('mode')?.split(',').filter(Boolean) ?? []) as TravelMode[]
  const maxPrice = Number(params.get('maxPrice')) || 0
  const sort = (params.get('sort') ?? 'departure') as TripSort

  const search = {
    from: from || undefined,
    to: to || undefined,
    date: date || undefined,
    seats,
    mode: modes,
    maxPrice: maxPrice || undefined,
    sort,
  }
  const trips = useQuery({ queryKey: ['trips', search], queryFn: () => api.searchTrips(search) })

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function toggleMode(mode: TravelMode) {
    const next = modes.includes(mode) ? modes.filter((m) => m !== mode) : [...modes, mode]
    update('mode', next.join(','))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SearchForm key={params.toString()} initial={{ from, to, date, seats }} compact />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Travel mode</p>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {MODES.map((mode) => (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    modes.includes(mode) ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={modes.includes(mode)} onChange={() => toggleMode(mode)} />
                  <ModeIcon mode={mode} className="size-4" />
                  {MODE_LABELS[mode]}
                </label>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Max fare</span>
            <select className={inputClass} value={maxPrice} onChange={(e) => update('maxPrice', e.target.value === '0' ? '' : e.target.value)}>
              {PRICE_CAPS.map((cap) => (
                <option key={cap} value={cap}>
                  {cap ? `Up to ₹${cap.toLocaleString('en-IN')}` : 'Any fare'}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by</span>
            <select className={inputClass} value={sort} onChange={(e) => update('sort', e.target.value === 'departure' ? '' : e.target.value)}>
              <option value="departure">Earliest departure</option>
              <option value="price">Lowest fare</option>
              <option value="duration">Shortest journey</option>
            </select>
          </label>
        </aside>

        <section aria-live="polite">
          <h1 className="mb-4 text-lg font-bold">
            {from || 'Anywhere'} to {to || 'anywhere'}
            {trips.data && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                {trips.data.length} {trips.data.length === 1 ? 'trip' : 'trips'}
              </span>
            )}
          </h1>
          {trips.isPending && <Spinner label="Finding trips" />}
          {trips.isError && <ErrorState message={trips.error.message} onRetry={() => trips.refetch()} />}
          {trips.data?.length === 0 && (
            <EmptyState title="No trips match this search">Try another date, more travel modes or a higher fare cap.</EmptyState>
          )}
          <div className="space-y-3">
            {trips.data?.map((trip) => <TripCard key={trip.id} trip={trip} seats={seats} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
