import type { AppData } from '../schema'

/** The example data model from CLAUDE.md. Clone before mutating. */
export const exampleData: AppData = {
  version: 1,
  people: [
    { id: 'p1', name: 'Charlie', salary: 2000, payFrequency: 'fortnightly', housing: 1200 },
    { id: 'p2', name: 'Layla', salary: 2200, payFrequency: 'fortnightly', housing: 1200 },
  ],
  card: { limit: 8000, splitDefault: 0.5 },
  savings: { goalName: 'Holiday', goalAmount: 10000, current: 3500, interestRate: 0.04 },
  currentPeriodId: '2026-11',
  periods: [
    {
      id: '2026-10',
      start: '2026-10-05',
      end: '2026-11-04',
      status: 'closed',
      available: 4800,
      purchases: [
        { id: 'x0', personId: 'p2', description: 'New shoes', amount: 140, date: '2026-10-18' },
      ],
      notes: [{ id: 'n0', text: 'Car rego due in March', date: '2026-10-20', pinned: true }],
      savedToSavings: 800,
      snapshot: {
        people: [
          { id: 'p1', name: 'Charlie', salary: 1900, payFrequency: 'fortnightly', housing: 1200 },
          { id: 'p2', name: 'Layla', salary: 2200, payFrequency: 'fortnightly', housing: 1200 },
        ],
        card: { limit: 8000, splitDefault: 0.5 },
      },
    },
    {
      id: '2026-11',
      start: '2026-11-05',
      end: '2026-12-04',
      status: 'open',
      available: 5200,
      purchases: [
        { id: 'x1', personId: 'p1', description: 'PlayStation game', amount: 100, date: '2026-11-12' },
      ],
      notes: [{ id: 'n1', text: 'Car rego due in March', date: '2026-11-10', pinned: true }],
      savedToSavings: null,
      snapshot: null,
    },
  ],
  lastUpdated: { at: '2026-11-17T09:30:00+13:00', by: 'p1' },
}

export function cloneExample(): AppData {
  return structuredClone(exampleData)
}
