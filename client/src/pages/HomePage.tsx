import { ArrowRight, BadgeCheck, RotateCcw, Ticket } from 'lucide-react'
import { Link } from 'react-router'
import { SearchForm } from '../components/SearchForm'

const POPULAR_ROUTES = [
  { from: 'Bengaluru', to: 'Goa', note: 'Flights, trains and sleeper buses' },
  { from: 'Bengaluru', to: 'Mumbai', note: 'Morning and evening flights' },
  { from: 'Bengaluru', to: 'Mysuru', note: 'Trains and buses all day' },
  { from: 'Bengaluru', to: 'Chennai', note: 'Day train or overnight bus' },
]

const HIGHLIGHTS = [
  { icon: Ticket, title: 'Live seat counts', text: 'Seats are checked when you search and again when you book.' },
  { icon: BadgeCheck, title: 'No double booking', text: 'Seats are reserved inside a locked transaction.' },
  { icon: RotateCcw, title: 'Cancel before departure', text: 'Cancelled seats go straight back on sale.' },
]

export function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-700 pb-24 pt-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-200">Flights · Trains · Buses</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
            Every way to get there, in one search.
          </h1>
          <p className="mt-4 max-w-xl text-teal-100">
            Compare departures across India, pick a seat count and book in a few clicks.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-6xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
          <SearchForm />
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-bold">Popular from Bengaluru</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_ROUTES.map((route) => (
            <Link
              key={route.to}
              to={`/trips?from=${route.from}&to=${route.to}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="flex items-center gap-2 font-semibold">
                {route.from} <ArrowRight className="size-4 text-teal-700" /> {route.to}
              </p>
              <p className="mt-1 text-sm text-slate-500">{route.note}</p>
            </Link>
          ))}
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <span className="h-fit rounded-xl bg-teal-50 p-2.5 text-teal-700">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
