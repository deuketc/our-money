import { describe, expect, it } from 'vitest'
import {
  calculatePeriod,
  cardOwing,
  daysSince,
  isBackupDue,
  isUpdateStale,
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
    const third: Person = { id: 'p3', name: 'Sam', salary: 0, payFrequency: 'monthly', housing: 0 }
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
    expect(charlie.monthlySalary).toBeCloseTo(4333.33, 2)
    expect(charlie.housing).toBe(1200)
    expect(charlie.personalPurchases).toBe(100)
    expect(charlie.sharedVisaOwing).toBe(1350)
    expect(charlie.totalVisaOwing).toBe(1450)
    expect(charlie.balance).toBeCloseTo(1683.33, 2)
  })

  it("calculates Layla's panel", () => {
    expect(layla.monthlySalary).toBeCloseTo(4766.67, 2)
    expect(layla.personalPurchases).toBe(0)
    expect(layla.sharedVisaOwing).toBe(1350)
    expect(layla.totalVisaOwing).toBe(1350)
    expect(layla.balance).toBeCloseTo(2216.67, 2)
  })

  it('calculates the couple summary', () => {
    expect(result.summary.totalSalary).toBeCloseTo(9100, 2)
    expect(result.summary.totalHousing).toBe(2400)
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
    expect(charlie.monthlySalary).toBeCloseTo(4116.67, 2)
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

  it('is not changed by later edits to live salaries', () => {
    const edited: AppData = {
      ...example,
      people: example.people.map((p) => ({ ...p, salary: 9999 })),
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
