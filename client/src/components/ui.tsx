import { AlertCircle, Bus, Loader2, Plane, TrainFront } from 'lucide-react'
import type { ReactNode } from 'react'
import { MODE_LABELS } from '../lib/styles'
import type { TravelMode } from '../lib/types'

const MODE_ICONS = { flight: Plane, train: TrainFront, bus: Bus }

export function ModeIcon({ mode, className = 'size-5' }: { mode: TravelMode; className?: string }) {
  const Icon = MODE_ICONS[mode]
  return <Icon className={className} aria-label={MODE_LABELS[mode]} />
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500" role="status">
      <Loader2 className="size-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert">
      <AlertCircle className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1 text-sm">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
}
