import { describe, expect, it } from 'vitest'
import { formatPeriodRange } from './format'

describe('formatPeriodRange', () => {
  it('labels a closed period by its dates, with the year once', () => {
    expect(formatPeriodRange({ start: '2026-11-15', end: '2026-12-15' })).toBe('15 Nov – 15 Dec 2026')
  })

  it('includes both years when the range crosses a year', () => {
    expect(formatPeriodRange({ start: '2026-12-20', end: '2027-01-15' })).toBe('20 Dec 2026 – 15 Jan 2027')
  })

  it('labels the open period "– now"', () => {
    expect(formatPeriodRange({ start: '2026-12-15', end: null })).toBe('15 Dec – now')
  })

  it('handles a period that closed the day it started', () => {
    expect(formatPeriodRange({ start: '2026-12-15', end: '2026-12-15' })).toBe('15 Dec – 15 Dec 2026')
  })

  it('uses the calendar date, whatever the time zone', () => {
    expect(formatPeriodRange({ start: '2026-01-01', end: '2026-12-31' })).toBe('1 Jan – 31 Dec 2026')
  })
})
