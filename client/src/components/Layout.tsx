import { useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router'
import { DemoBanner } from '../demo/DemoBanner'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-2.5 py-2 text-sm font-medium transition sm:px-3 ${
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:text-slate-900'
  }`

export function Layout() {
  const { pathname } = useLocation()

  // Start each page at the top instead of keeping the previous page's scroll position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      {import.meta.env.VITE_DEMO === 'true' && <DemoBanner />}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8" />
            Voyagr
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <NavLink to="/" end className={navClass}>
              Search
            </NavLink>
            <NavLink to="/my-trips" className={navClass}>
              My trips
            </NavLink>
            <NavLink to="/register" className={navClass}>
              Register
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Voyagr demo. Timetables and operators are fictional; all times are shown in IST.
      </footer>
    </div>
  )
}
