// Pure calculation functions. Nothing here touches React, storage or the DOM.
// Only what people type in is stored; everything in this file is derived
// on demand and never saved (see "Data model" in CLAUDE.md).
//
// Amounts are returned unrounded (fortnightly pay doesn't divide evenly into
// months). Round only when displaying.

import type { AppData, Card, PayFrequency, Period, Person, Purchase } from './schema'

// ---------- Salary ----------

const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  yearly: 1,
}

/** Converts pay to a monthly figure. Fortnightly is × 26 ÷ 12, not × 2. */
export function toMonthly(amount: number, frequency: PayFrequency): number {
  return (amount * PERIODS_PER_YEAR[frequency]) / 12
}

// ---------- Credit card ----------

/** Owing = limit − available (both from the bank statement). */
export function cardOwing(limit: number, available: number): number {
  return limit - available
}

/** Sum of personal purchases for one person. */
export function personalTotal(purchases: Purchase[], personId: string): number {
  return purchases
    .filter((p) => p.personId === personId)
    .reduce((sum, p) => sum + p.amount, 0)
}

/**
 * Shared spend = owing − everyone's personal purchases.
 * Not clamped: if more personal spending is logged than the card owes
 * (e.g. part of the card was paid off), this goes negative.
 */
export function sharedSpend(owing: number, purchases: Purchase[]): number {
  return owing - purchases.reduce((sum, p) => sum + p.amount, 0)
}

/**
 * Each person's fraction of shared spend.
 * One person: 100%. Two people: splitDefault / (1 − splitDefault).
 * More people: split evenly.
 */
export function shareFractions(people: Person[], card: Card): Map<string, number> {
  const fractions = new Map<string, number>()
  if (people.length === 2) {
    fractions.set(people[0].id, card.splitDefault)
    fractions.set(people[1].id, 1 - card.splitDefault)
  } else {
    for (const person of people) fractions.set(person.id, 1 / people.length)
  }
  return fractions
}

// ---------- Period results ----------

export interface PersonResult {
  personId: string
  name: string
  monthlySalary: number
  housing: number
  personalPurchases: number
  sharedVisaOwing: number
  totalVisaOwing: number
  /** Positive = green, negative = red. */
  balance: number
}

export interface PeriodResult {
  people: PersonResult[]
  card: {
    limit: number
    available: number
    owing: number
    sharedSpend: number
    personalSpend: number
  }
  summary: {
    totalSalary: number
    totalHousing: number
    totalVisaOwing: number
    balance: number
  }
}

/**
 * Calculates everything for one period. Closed periods use their snapshot,
 * so later salary or housing changes don't rewrite history. Open periods
 * use the live top-level values.
 */
export function calculatePeriod(data: AppData, period: Period): PeriodResult {
  const people = period.snapshot?.people ?? data.people
  const card = period.snapshot?.card ?? data.card

  const owing = cardOwing(card.limit, period.available)
  const shared = sharedSpend(owing, period.purchases)
  const fractions = shareFractions(people, card)

  const results: PersonResult[] = people.map((person) => {
    const monthlySalary = toMonthly(person.salary, person.payFrequency)
    const personalPurchases = personalTotal(period.purchases, person.id)
    const sharedVisaOwing = shared * (fractions.get(person.id) ?? 0)
    const totalVisaOwing = sharedVisaOwing + personalPurchases
    return {
      personId: person.id,
      name: person.name,
      monthlySalary,
      housing: person.housing,
      personalPurchases,
      sharedVisaOwing,
      totalVisaOwing,
      balance: monthlySalary - person.housing - totalVisaOwing,
    }
  })

  const sum = (pick: (r: PersonResult) => number) =>
    results.reduce((total, r) => total + pick(r), 0)

  return {
    people: results,
    card: {
      limit: card.limit,
      available: period.available,
      owing,
      sharedSpend: shared,
      personalSpend: owing - shared,
    },
    summary: {
      totalSalary: sum((r) => r.monthlySalary),
      totalHousing: sum((r) => r.housing),
      totalVisaOwing: sum((r) => r.totalVisaOwing),
      balance: sum((r) => r.balance),
    },
  }
}

// ---------- Savings ----------

/**
 * Average saved per period over the most recent `count` closed periods
 * that recorded a saving. Returns null when there's no history yet.
 */
export function averageSaved(periods: Period[], count = 3): number | null {
  const saved = periods
    .filter((p) => p.status === 'closed' && p.savedToSavings !== null)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(-count)
    .map((p) => p.savedToSavings as number)
  if (saved.length === 0) return null
  return saved.reduce((sum, n) => sum + n, 0) / saved.length
}

/**
 * Balance after `months` of saving `monthly`, starting from `current`.
 * Interest (yearly rate) compounds monthly on the balance at the start of
 * each month; the contribution is added at the end of the month.
 */
export function projectSavings(
  current: number,
  monthly: number,
  months: number,
  interestRate = 0,
): number {
  const r = interestRate / 12
  let balance = current
  for (let i = 0; i < months; i++) balance = balance * (1 + r) + monthly
  return balance
}

const MAX_MONTHS = 1200 // 100 years: treat anything longer as "never"

/**
 * Whole months until savings reach the goal, or null if it never will
 * at this rate. 0 if the goal is already reached.
 */
export function monthsToGoal(
  current: number,
  goal: number,
  monthly: number,
  interestRate = 0,
): number | null {
  const r = interestRate / 12
  let balance = current
  for (let months = 0; months <= MAX_MONTHS; months++) {
    if (balance >= goal) return months
    balance = balance * (1 + r) + monthly
  }
  return null
}

/** Adds whole months to a "YYYY-MM" period id. */
export function addMonths(periodId: string, months: number): string {
  const [year, month] = periodId.split('-').map(Number)
  const index = year * 12 + (month - 1) + months
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

/**
 * When the savings goal will be reached, as a "YYYY-MM" month, counting
 * from `fromPeriodId`. Null if there's no saving history or it never will.
 */
export function goalDate(data: AppData, fromPeriodId: string): string | null {
  const monthly = averageSaved(data.periods)
  if (monthly === null) return null
  const { current, goalAmount, interestRate } = data.savings
  const months = monthsToGoal(current, goalAmount, monthly, interestRate)
  return months === null ? null : addMonths(fromPeriodId, months)
}

// ---------- Last updated ----------

const DAY_MS = 24 * 60 * 60 * 1000

/** True when it's been more than `days` since the last update. */
export function isUpdateStale(lastUpdatedAt: string, now: Date, days = 7): boolean {
  return now.getTime() - new Date(lastUpdatedAt).getTime() > days * DAY_MS
}
