import type { TravelMode } from './types'

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20'

export const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60'

export const MODE_LABELS: Record<TravelMode, string> = { flight: 'Flight', train: 'Train', bus: 'Bus' }
