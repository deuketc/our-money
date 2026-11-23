import { describe, expect, it } from 'vitest'
import { appDataSchema, CURRENT_VERSION } from './schema'
import { cloneExample } from './test/exampleData'

describe('appDataSchema', () => {
  it('accepts the example file', () => {
    expect(appDataSchema.safeParse(cloneExample()).success).toBe(true)
    expect(cloneExample().version).toBe(CURRENT_VERSION)
  })

  it('accepts a period that closed the day it started', () => {
    const data = cloneExample()
    data.periods[0].end = data.periods[0].start
    expect(appDataSchema.safeParse(data).success).toBe(true)
  })

  it('accepts any unique period id', () => {
    const data = cloneExample()
    data.periods[1].id = '3f0c8f2e-5b8a-4c1e-9d3a-2b7f6e1a9c40'
    data.currentPeriodId = data.periods[1].id
    expect(appDataSchema.safeParse(data).success).toBe(true)
  })

  it.each([
    ['an unknown version', (d: any) => (d.version = 4)],
    ['an old version 1 file', (d: any) => (d.version = 1)],
    ['the retired savings fields', (d: any) => (d.savings = { goalName: 'Holiday' })],
    ['an unknown key', (d: any) => (d.people[0].isAdmin = true)],
    ['a negative income amount', (d: any) => (d.people[0].incomes[0].amount = -1)],
    ['a negative expense amount', (d: any) => (d.people[0].expenses[0].amount = -1)],
    ['a non-number amount', (d: any) => (d.periods[1].available = '5200')],
    ['a bad frequency', (d: any) => (d.people[0].expenses[0].frequency = 'daily')],
    ['a person without income lines', (d: any) => delete d.people[0].incomes],
    ['the old salary and housing fields', (d: any) => Object.assign(d.people[0], { salary: 2000, payFrequency: 'fortnightly', housing: 1200 })],
    ['duplicate line ids for a person', (d: any) => (d.people[0].expenses[0].id = 'i1')],
    ['duplicate line ids in a snapshot', (d: any) => (d.periods[0].snapshot.people[1].expenses[0].id = 'i2')],
    ['an old version 2 file', (d: any) => (d.version = 2)],
    ['a bad date', (d: any) => (d.periods[1].purchases[0].date = 'next Tuesday')],
    ['a purchase by an unknown person', (d: any) => (d.periods[1].purchases[0].personId = 'p9')],
    ['a missing current period', (d: any) => (d.currentPeriodId = 'pd9')],
    ['a closed current period', (d: any) => (d.currentPeriodId = 'pd1')],
    ['a closed period without a snapshot', (d: any) => (d.periods[0].snapshot = null)],
    ['a closed period without an end date', (d: any) => (d.periods[0].end = null)],
    ['an open period with an end date', (d: any) => (d.periods[1].end = '2026-12-05')],
    ['a period that ends before it starts', (d: any) => (d.periods[0].end = '2026-10-01')],
    ['duplicate period ids', (d: any) => (d.periods[1].id = 'pd1')],
    ['an empty period id', (d: any) => (d.periods[1].id = d.currentPeriodId = '')],
    ['duplicate person ids', (d: any) => (d.people[1].id = 'p1')],
  ])('rejects %s', (_, tamper) => {
    const data = cloneExample()
    tamper(data)
    expect(appDataSchema.safeParse(data).success).toBe(false)
  })
})
