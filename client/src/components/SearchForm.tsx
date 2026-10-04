import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { api, toQueryString } from '../lib/api'
import { todayInIndia } from '../lib/format'
import { Field } from './ui'
import { buttonClass, inputClass } from '../lib/styles'

export interface SearchValues {
  from: string
  to: string
  date: string
  seats: number
}

export function SearchForm({ initial, compact = false }: { initial?: Partial<SearchValues>; compact?: boolean }) {
  const navigate = useNavigate()
  const cities = useQuery({ queryKey: ['cities'], queryFn: api.cities, staleTime: Infinity })
  const [values, setValues] = useState<SearchValues>({
    from: initial?.from ?? 'Bengaluru',
    to: initial?.to ?? '',
    date: initial?.date ?? '',
    seats: initial?.seats ?? 1,
  })

  const set = <K extends keyof SearchValues>(key: K, value: SearchValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    navigate(`/trips${toQueryString({ ...values, seats: values.seats > 1 ? values.seats : undefined })}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`grid gap-3 ${compact ? 'md:grid-cols-[1fr_auto_1fr_1fr_7rem_auto]' : 'md:grid-cols-[1fr_auto_1fr_1fr_7rem]'} md:items-end`}
    >
      <Field label="From">
        <select className={inputClass} value={values.from} onChange={(e) => set('from', e.target.value)}>
          <option value="">Anywhere</option>
          {cities.data?.map((city) => <option key={city}>{city}</option>)}
        </select>
      </Field>
      <button
        type="button"
        onClick={() => setValues((v) => ({ ...v, from: v.to, to: v.from }))}
        className="mx-auto mb-1 rounded-full border border-slate-300 p-2 text-slate-500 transition hover:text-teal-700"
        aria-label="Swap origin and destination"
      >
        <ArrowLeftRight className="size-4" />
      </button>
      <Field label="To">
        <select className={inputClass} value={values.to} onChange={(e) => set('to', e.target.value)}>
          <option value="">Anywhere</option>
          {cities.data?.map((city) => <option key={city}>{city}</option>)}
        </select>
      </Field>
      <Field label="Date">
        <input
          type="date"
          className={inputClass}
          min={todayInIndia()}
          value={values.date}
          onChange={(e) => set('date', e.target.value)}
        />
      </Field>
      <Field label="Travellers">
        <input
          type="number"
          min={1}
          max={9}
          className={inputClass}
          value={values.seats}
          onChange={(e) => set('seats', Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
        />
      </Field>
      <button type="submit" className={`${buttonClass} ${compact ? '' : 'md:col-span-5'} py-3`}>
        <Search className="size-4" />
        Search trips
      </button>
    </form>
  )
}
