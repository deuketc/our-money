// Display formatting. Calculations stay unrounded; rounding happens here.

const moneyFormat = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  trailingZeroDisplay: 'stripIfInteger',
})

const wholeMoneyFormat = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
})

/** "$1,350" or "$4,333.33". Never shows "-$0". */
export function formatMoney(amount: number): string {
  return moneyFormat.format(Math.round(amount * 100) / 100 || 0)
}

/** Whole dollars, for the hero balance: "$3,900". */
export function formatMoneyWhole(amount: number): string {
  return wholeMoneyFormat.format(Math.round(amount) || 0)
}

/** "2026-11-15" → "15 Nov", or "15 Nov 2026" with the year. */
function dayMonth(date: string, withYear: boolean): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

/**
 * A period's label from its dates.
 * - Closed: "15 Nov – 15 Dec 2026", or "20 Dec 2026 – 15 Jan 2027" when it
 *   crosses a year.
 * - Open (no end yet): "15 Dec – now".
 */
export function formatPeriodRange({ start, end }: { start: string; end: string | null }): string {
  if (end === null) return `${dayMonth(start, false)} – now`
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${dayMonth(start, !sameYear)} – ${dayMonth(end, true)}`
}

/** "2026-11-12" → "12 Nov". */
export function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** An ISO timestamp as a local date: "17 Nov 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Today's local date as "YYYY-MM-DD". */
export function todayIso(now = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

const relativeFormat = new Intl.RelativeTimeFormat('en-NZ', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "just now", "5 minutes ago", "yesterday", "2 weeks ago". */
export function formatRelative(iso: string, now = new Date()): string {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}
