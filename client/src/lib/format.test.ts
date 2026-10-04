import { describe, expect, it } from 'vitest'
import { toQueryString } from './api'
import { formatDuration, formatPrice, formatTime, todayInIndia } from './format'

describe('format', () => {
  it('formats durations', () => {
    expect(formatDuration('2026-10-05T00:40:00Z', '2026-10-05T02:25:00Z')).toBe('1h 45m')
    expect(formatDuration('2026-10-05T00:00:00Z', '2026-10-05T00:50:00Z')).toBe('50m')
    expect(formatDuration('2026-10-05T00:00:00Z', '2026-10-06T10:00:00Z')).toBe('34h')
  })

  it('shows times in IST', () => {
    expect(formatTime('2026-10-05T00:40:00Z')).toBe('06:10')
    expect(todayInIndia(new Date('2026-10-04T20:00:00Z'))).toBe('2026-10-05')
  })

  it('formats rupees without decimals', () => {
    expect(formatPrice(4899)).toBe('₹4,899')
    expect(formatPrice(125000)).toBe('₹1,25,000')
  })
})

describe('toQueryString', () => {
  it('skips empty values and joins arrays', () => {
    expect(toQueryString({ from: 'Bengaluru', to: '', mode: ['flight', 'train'], seats: 2, date: undefined }))
      .toBe('?from=Bengaluru&mode=flight%2Ctrain&seats=2')
    expect(toQueryString({ mode: [] })).toBe('')
  })
})
