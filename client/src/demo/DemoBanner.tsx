import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { resetDemoData } from './storage'

const SOURCE_URL = 'https://github.com/Raja9964/Voyagr'

export function DemoBanner() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    if (!restored) return
    const timer = setTimeout(() => setRestored(false), 3000)
    return () => clearTimeout(timer)
  }, [restored])

  function onReset() {
    if (!window.confirm('Reset the demo? Travellers and bookings you added will be removed.')) return
    resetDemoData()
    queryClient.clear()
    navigate('/')
    setRestored(true)
  }

  return (
    <aside aria-label="About this demo" className="bg-slate-900 text-xs text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1.5 px-4 py-2 text-center sm:justify-between sm:text-left">
        <p>
          <strong className="font-semibold text-white">Live demo</strong> ·{' '}
          <span className="whitespace-nowrap">runs in your browser with sample data</span> ·{' '}
          <span className="whitespace-nowrap">the full app uses Express + MySQL</span>
        </p>
        <div className="flex items-center gap-5 font-semibold">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-teal-300 transition hover:text-teal-200"
          >
            View source <ExternalLink className="size-3" />
          </a>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-slate-300 transition hover:text-white"
          >
            <RotateCcw className="size-3" />
            {restored ? 'Sample data restored' : 'Reset data'}
          </button>
        </div>
      </div>
    </aside>
  )
}
