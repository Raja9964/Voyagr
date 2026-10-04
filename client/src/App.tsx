import { Link, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { BookingPage } from './pages/BookingPage'
import { ConfirmationPage } from './pages/ConfirmationPage'
import { HomePage } from './pages/HomePage'
import { MyTripsPage } from './pages/MyTripsPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResultsPage } from './pages/ResultsPage'

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block font-semibold text-teal-700 underline">
        Back to search
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="trips" element={<ResultsPage />} />
        <Route path="trips/:id/book" element={<BookingPage />} />
        <Route path="bookings/:id" element={<ConfirmationPage />} />
        <Route path="my-trips" element={<MyTripsPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
