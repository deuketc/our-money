import type { AppData } from '../schema'

/** The example data model from CLAUDE.md. Clone before mutating. */
export const exampleData: AppData = {
  version: 3,
  people: [
    {
      id: 'p1',
      name: 'Charlie',
      incomes: [{ id: 'i1', name: 'Salary', amount: 2000, frequency: 'fortnightly' }],
      expenses: [{ id: 'e1', name: 'Housing', amount: 1200, frequency: 'monthly' }],
    },
    {
      id: 'p2',
      name: 'Layla',
      incomes: [{ id: 'i2', name: 'Salary', amount: 2200, frequency: 'fortnightly' }],
      expenses: [{ id: 'e2', name: 'Housing', amount: 1200, frequency: 'monthly' }],
    },
  ],
  card: { limit: 8000, splitDefault: 0.5 },
  currentPeriodId: 'pd2',
  periods: [
    {
      // "5 Oct – 5 Nov 2026": closed on 5 Nov, which is when the next one started.
      id: 'pd1',
      start: '2026-10-05',
      end: '2026-11-05',
      status: 'closed',
      available: 4800,
      purchases: [
        { id: 'x0', personId: 'p2', description: 'New shoes', amount: 140, date: '2026-10-18' },
      ],
      notes: [{ id: 'n0', text: 'Car rego due in March', date: '2026-10-20', pinned: true }],
      snapshot: {
        people: [
          {
            // Charlie's salary before his pay rise.
            id: 'p1',
            name: 'Charlie',
            incomes: [{ id: 'i1', name: 'Salary', amount: 1900, frequency: 'fortnightly' }],
            expenses: [{ id: 'e1', name: 'Housing', amount: 1200, frequency: 'monthly' }],
          },
          {
            id: 'p2',
            name: 'Layla',
            incomes: [{ id: 'i2', name: 'Salary', amount: 2200, frequency: 'fortnightly' }],
            expenses: [{ id: 'e2', name: 'Housing', amount: 1200, frequency: 'monthly' }],
          },
        ],
        card: { limit: 8000, splitDefault: 0.5 },
      },
    },
    {
      // "5 Nov – now": open, so no end date yet.
      id: 'pd2',
      start: '2026-11-05',
      end: null,
      status: 'open',
      available: 5200,
      purchases: [
        { id: 'x1', personId: 'p1', description: 'PlayStation game', amount: 100, date: '2026-11-12' },
      ],
      notes: [{ id: 'n1', text: 'Car rego due in March', date: '2026-11-10', pinned: true }],
      snapshot: null,
    },
  ],
  lastUpdated: { at: '2026-11-17T09:30:00+13:00', by: 'p1' },
}

export function cloneExample(): AppData {
  return structuredClone(exampleData)
}
