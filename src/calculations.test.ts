import { describe, expect, it } from 'vitest'
import {
  calculatePeriod,
  cardOwing,
  daysSince,
  isBackupDue,
  isUpdateStale,
  monthlyTotal,
  periodsNewestFirst,
  personalTotal,
  shareFractions,
  sharedSpend,
  toMonthly,
} from './calculations'
import type { AppData, Person } from './schema'
import { exampleData } from './test/exampleData'

const example: AppData = exampleData

const [october, november] = example.periods

describe('toMonthly', () => {
  it('converts fortnightly pay with × 26 ÷ 12, not × 2', () => {
    // $2,000 a fortnight is about $4,333 a month.
    expect(toMonthly(2000, 'fortnightly')).toBeCloseTo(4333.33, 2)
    expect(toMonthly(2000, 'fortnightly')).not.toBe(4000)
  })

  it('converts weekly pay with × 52 ÷ 12', () => {
    expect(toMonthly(1000, 'weekly')).toBeCloseTo(4333.33, 2)
  })

  it('leaves monthly pay unchanged', () => {
    expect(toMonthly(5000, 'monthly')).toBe(5000)
  })

  it('divides yearly pay by 12', () => {
    expect(toMonthly(60000, 'yearly')).toBe(5000)
  })
})

describe('monthlyTotal', () => {
  it('adds lines, converting each from its own frequency', () => {
    expect(
      monthlyTotal([
        { id: 'a', name: 'Salary', amount: 2000, frequency: 'fortnightly' }, // 4,333.33
        { id: 'b', name: 'Side job', amount: 100, frequency: 'weekly' }, // 433.33
        { id: 'c', name: 'Bonus', amount: 1200, frequency: 'yearly' }, // 100
        { id: 'd', name: 'Rent from flatmate', amount: 300, frequency: 'monthly' }, // 300
      ]),
    ).toBeCloseTo(5166.67, 2)
  })

  it('is 0 with no lines', () => {
    expect(monthlyTotal([])).toBe(0)
  })
})

describe('calculatePeriod – several income and expense lines', () => {
  it('left over is monthly income − monthly expenses − total Visa owing', () => {
    const data: AppData = structuredClone(example)
    data.people[0].incomes.push({ id: 'i3', name: 'Side job', amount: 100, frequency: 'weekly' })
    data.people[0].expenses.push({ id: 'e3', name: 'Car insurance', amount: 600, frequency: 'yearly' })
    const [charlie] = calculatePeriod(data, data.periods[1]).people

    expect(charlie.monthlyIncome).toBeCloseTo(4766.67, 2) // 4,333.33 + 433.33
    expect(charlie.monthlyExpenses).toBe(1200 + 50)
    expect(charlie.totalVisaOwing).toBe(1450)
    expect(charlie.balance).toBeCloseTo(4766.67 - 1250 - 1450, 2)
  })
})

describe('credit card', () => {
  it('owing is limit minus available', () => {
    expect(cardOwing(8000, 5200)).toBe(2800)
  })

  it('totals personal purchases per person', () => {
    expect(personalTotal(november.purchases, 'p1')).toBe(100)
    expect(personalTotal(november.purchases, 'p2')).toBe(0)
  })

  it('shared spend is owing minus all personal purchases', () => {
    expect(sharedSpend(2800, november.purchases)).toBe(2700)
  })

  it('goes negative rather than hiding it when personal purchases exceed owing', () => {
    expect(sharedSpend(50, november.purchases)).toBe(-50)
  })

  it('splits 50/50 by default for two people', () => {
    const fractions = shareFractions(example.people, example.card)
    expect(fractions.get('p1')).toBe(0.5)
    expect(fractions.get('p2')).toBe(0.5)
  })

  it('gives a single person all of the shared spend', () => {
    const fractions = shareFractions([example.people[0]], example.card)
    expect(fractions.get('p1')).toBe(1)
  })

  it('splits evenly between three or more people', () => {
    const third: Person = { id: 'p3', name: 'Sam', incomes: [], expenses: [] }
    const fractions = shareFractions([...example.people, third], example.card)
    expect(fractions.get('p3')).toBeCloseTo(1 / 3)
  })
})

describe('calculatePeriod – November (open, live values)', () => {
  const result = calculatePeriod(example, november)
  const [charlie, layla] = result.people

  it('calculates the card', () => {
    expect(result.card).toEqual({
      limit: 8000,
      available: 5200,
      owing: 2800,
      sharedSpend: 2700,
      personalSpend: 100,
    })
  })

  it("calculates Charlie's panel", () => {
    expect(charlie.monthlyIncome).toBeCloseTo(4333.33, 2)
    expect(charlie.monthlyExpenses).toBe(1200)
    expect(charlie.personalPurchases).toBe(100)
    expect(charlie.sharedVisaOwing).toBe(1350)
    expect(charlie.totalVisaOwing).toBe(1450)
    expect(charlie.balance).toBeCloseTo(1683.33, 2)
  })

  it("calculates Layla's panel", () => {
    expect(layla.monthlyIncome).toBeCloseTo(4766.67, 2)
    expect(layla.personalPurchases).toBe(0)
    expect(layla.sharedVisaOwing).toBe(1350)
    expect(layla.totalVisaOwing).toBe(1350)
    expect(layla.balance).toBeCloseTo(2216.67, 2)
  })

  it('calculates the couple summary', () => {
    expect(result.summary.totalIncome).toBeCloseTo(9100, 2)
    expect(result.summary.totalExpenses).toBe(2400)
    expect(result.summary.totalVisaOwing).toBe(2800)
    expect(result.summary.balance).toBeCloseTo(3900, 2)
  })

  it("everyone's Visa owing adds up to the card's owing", () => {
    const total = result.people.reduce((sum, p) => sum + p.totalVisaOwing, 0)
    expect(total).toBe(result.card.owing)
  })
})

describe('calculatePeriod – October (closed, uses snapshot)', () => {
  const result = calculatePeriod(example, october)
  const [charlie, layla] = result.people

  it("uses Charlie's old $1,900 salary, not his current $2,000", () => {
    expect(charlie.monthlyIncome).toBeCloseTo(4116.67, 2)
  })

  it('calculates the card and split', () => {
    expect(result.card.owing).toBe(3200)
    expect(result.card.sharedSpend).toBe(3060)
    expect(charlie.totalVisaOwing).toBe(1530)
    expect(layla.totalVisaOwing).toBe(1670) // 1530 shared + 140 shoes
  })

  it('calculates balances', () => {
    expect(charlie.balance).toBeCloseTo(1386.67, 2)
    expect(layla.balance).toBeCloseTo(1896.67, 2)
    expect(result.summary.balance).toBeCloseTo(3283.33, 2)
  })

  it('is not changed by later edits to live income', () => {
    const edited: AppData = {
      ...example,
      people: example.people.map((p) => ({ ...p, incomes: [{ id: 'i9', name: 'Salary', amount: 9999, frequency: 'monthly' as const }] })),
    }
    expect(calculatePeriod(edited, october)).toEqual(result)
  })
})

describe('calculatePeriod – single person', () => {
  it('counts everything as theirs', () => {
    const solo: AppData = { ...example, people: [example.people[0]] }
    const [charlie] = calculatePeriod(solo, november).people
    expect(charlie.sharedVisaOwing).toBe(2700)
    expect(charlie.totalVisaOwing).toBe(2800)
  })
})

describe('isUpdateStale', () => {
  const at = example.lastUpdated!.at

  it('is fresh within a week', () => {
    expect(isUpdateStale(at, new Date('2026-11-20T09:30:00+13:00'))).toBe(false)
  })

  it('is still fresh at exactly 7 days', () => {
    expect(isUpdateStale(at, new Date('2026-11-24T09:30:00+13:00'))).toBe(false)
  })

  it('is stale after more than 7 days', () => {
    expect(isUpdateStale(at, new Date('2026-11-24T09:31:00+13:00'))).toBe(true)
  })
})

describe('isBackupDue', () => {
  const at = '2026-11-01T09:30:00+13:00'

  it('is not due within 14 days', () => {
    expect(isBackupDue(at, new Date('2026-11-15T09:30:00+13:00'))).toBe(false)
  })

  it('is due after more than 14 days', () => {
    expect(isBackupDue(at, new Date('2026-11-15T09:31:00+13:00'))).toBe(true)
  })

  it('is never due when there has been no backup (the header says "Never")', () => {
    expect(isBackupDue(null, new Date('2030-01-01'))).toBe(false)
  })
})

describe('daysSince', () => {
  it('counts whole days', () => {
    expect(daysSince('2026-11-01T09:30:00+13:00', new Date('2026-11-16T09:29:00+13:00'))).toBe(14)
    expect(daysSince('2026-11-01T09:30:00+13:00', new Date('2026-11-16T09:30:00+13:00'))).toBe(15)
  })
})

describe('periodsNewestFirst', () => {
  it('orders by start date, newest first', () => {
    expect(periodsNewestFirst(example.periods).map((p) => p.id)).toEqual(['pd2', 'pd1'])
  })

  it('puts the later period first when two start on the same day', () => {
    const closedSameDay = { ...october, id: 'a', start: '2026-11-05', end: '2026-11-05' }
    const opened = { ...november, id: 'b' }
    expect(periodsNewestFirst([closedSameDay, opened]).map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('does not reorder the input', () => {
    const periods = [...example.periods]
    periodsNewestFirst(periods)
    expect(periods.map((p) => p.id)).toEqual(['pd1', 'pd2'])
  })
})
