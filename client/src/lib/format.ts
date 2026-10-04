// Every route is in India, so times are shown in IST whatever the viewer's timezone.
const TIME_ZONE = 'Asia/Kolkata'

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE,
})

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})

const priceFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
export const formatPrice = (amount: number) => priceFormat.format(amount)

export function formatDuration(fromIso: string, toIso: string): string {
  const minutes = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

// Today's date in IST as YYYY-MM-DD, for date inputs.
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}
