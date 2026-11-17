import { describe, expect, it } from 'vitest'
import { appDataSchema } from './schema'
import { cloneExample } from './test/exampleData'

describe('appDataSchema', () => {
  it('accepts the example file', () => {
    expect(appDataSchema.safeParse(cloneExample()).success).toBe(true)
  })

  it.each([
    ['an unknown version', (d: any) => (d.version = 2)],
    ['an unknown key', (d: any) => (d.people[0].isAdmin = true)],
    ['a negative salary', (d: any) => (d.people[0].salary = -1)],
    ['a non-number amount', (d: any) => (d.periods[1].available = '5200')],
    ['a bad pay frequency', (d: any) => (d.people[0].payFrequency = 'daily')],
    ['a bad date', (d: any) => (d.periods[1].purchases[0].date = 'next Tuesday')],
    ['a purchase by an unknown person', (d: any) => (d.periods[1].purchases[0].personId = 'p9')],
    ['a missing current period', (d: any) => (d.currentPeriodId = '2027-01')],
    ['a closed current period', (d: any) => (d.currentPeriodId = '2026-10')],
    ['a closed period without a snapshot', (d: any) => (d.periods[0].snapshot = null)],
    ['duplicate person ids', (d: any) => (d.people[1].id = 'p1')],
  ])('rejects %s', (_, tamper) => {
    const data = cloneExample()
    tamper(data)
    expect(appDataSchema.safeParse(data).success).toBe(false)
  })
})
