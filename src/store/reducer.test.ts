import { describe, expect, it } from 'vitest'
import { calculatePeriod } from '../calculations'
import { appDataSchema, type AppData } from '../schema'
import { cloneExample } from '../test/exampleData'
import {
  createInitialState,
  nextPeriodDates,
  reducer,
  type Action,
  type Meta,
} from './reducer'

const meta: Meta = { at: '2026-12-05T08:00:00.000Z', by: 'p2' }
const run = (state: AppData, ...actions: Action[]) =>
  actions.reduce((s, action) => reducer(s, { ...action, meta }), state)

const close = (savedToSavings: number | null = null): Action => ({
  type: 'closeMonth',
  savedToSavings,
})

const periodById = (state: AppData, id: string) => {
  const period = state.periods.find((p) => p.id === id)
  if (!period) throw new Error(`No period ${id}`)
  return period
}

describe('closeMonth', () => {
  it('marks November closed and opens December', () => {
    const state = run(cloneExample(), close(1000))

    expect(periodById(state, '2026-11').status).toBe('closed')
    expect(state.currentPeriodId).toBe('2026-12')
    const december = periodById(state, '2026-12')
    expect(december.status).toBe('open')
    expect(state.periods.map((p) => p.id)).toEqual(['2026-10', '2026-11', '2026-12'])
  })

  it('follows on from the statement dates', () => {
    const december = periodById(run(cloneExample(), close()), '2026-12')
    expect(december.start).toBe('2026-12-05')
    expect(december.end).toBe('2027-01-04')
  })

  it('snapshots people and card as they were at close', () => {
    const state = run(cloneExample(), close())
    expect(periodById(state, '2026-11').snapshot).toEqual({
      people: cloneExample().people,
      card: cloneExample().card,
    })
  })

  it("keeps the closed month's numbers after a pay rise", () => {
    const closed = run(cloneExample(), close())
    const before = calculatePeriod(closed, periodById(closed, '2026-11'))

    const afterRaise = run(
      closed,
      { type: 'updatePerson', id: 'p1', changes: { salary: 2500 } },
      { type: 'updateCard', periodId: '2026-12', changes: { limit: 10000 } },
    )
    const november = periodById(afterRaise, '2026-11')

    expect(november.snapshot?.people[0].salary).toBe(2000)
    expect(november.snapshot?.card.limit).toBe(8000)
    expect(calculatePeriod(afterRaise, november)).toEqual(before)
    expect(before.summary.balance).toBeCloseTo(3900, 2)
  })

  it('carries over people, card and savings goal', () => {
    const before = cloneExample()
    const state = run(before, close())
    expect(state.people).toEqual(before.people)
    expect(state.card).toEqual(before.card)
    expect(state.savings.goalName).toBe('Holiday')
  })

  it('clears purchases and starts available at the card limit', () => {
    const december = periodById(run(cloneExample(), close()), '2026-12')
    expect(december.purchases).toEqual([])
    expect(december.available).toBe(8000)
  })

  it('carries pinned notes forward and drops unpinned ones', () => {
    const state = run(cloneExample(), {
      type: 'addNote',
      periodId: '2026-11',
      note: { id: 'n2', text: 'Pay the plumber', date: '2026-11-20', pinned: false },
    }, close())

    expect(periodById(state, '2026-11').notes.map((n) => n.text)).toEqual([
      'Car rego due in March',
      'Pay the plumber',
    ])
    expect(periodById(state, '2026-12').notes.map((n) => n.text)).toEqual([
      'Car rego due in March',
    ])
  })

  it('records the amount saved and adds it to savings', () => {
    const state = run(cloneExample(), close(3900))
    expect(periodById(state, '2026-11').savedToSavings).toBe(3900)
    expect(state.savings.current).toBe(3500 + 3900)
  })

  it('leaves savings alone when the user skips saving', () => {
    const state = run(cloneExample(), close(null))
    expect(periodById(state, '2026-11').savedToSavings).toBeNull()
    expect(state.savings.current).toBe(3500)
  })

  it('stamps lastUpdated', () => {
    expect(run(cloneExample(), close()).lastUpdated).toEqual({
      at: meta.at,
      by: 'p2',
    })
  })

  it('produces a valid save file', () => {
    const state = run(cloneExample(), close(800), close(500))
    expect(appDataSchema.safeParse(state).success).toBe(true)
    expect(state.currentPeriodId).toBe('2027-01')
  })

  it('works on a first-run state with nobody added yet', () => {
    const initial = createInitialState(new Date(2026, 10, 17))
    const state = reducer(initial, { ...close(), meta: { at: meta.at, by: null } })
    expect(state.currentPeriodId).toBe('2026-12')
    expect(periodById(state, '2026-11').snapshot).toEqual({ people: [], card: initial.card })
    expect(appDataSchema.safeParse(state).success).toBe(true)
  })

  it('does not change the input state', () => {
    const before = cloneExample()
    run(before, close(1000))
    expect(before).toEqual(cloneExample())
  })
})

describe('nextPeriodDates', () => {
  it('rolls over the year', () => {
    expect(nextPeriodDates('2026-12-04')).toEqual({ start: '2026-12-05', end: '2027-01-04' })
  })

  it('clamps to short months', () => {
    expect(nextPeriodDates('2027-01-30')).toEqual({ start: '2027-01-31', end: '2027-02-27' })
  })
})

describe('other actions', () => {
  it('adds a person and credits them as the updater on first run', () => {
    const state = reducer(createInitialState(new Date(2026, 10, 17)), {
      type: 'addPerson',
      person: { id: 'p1', name: 'Charlie', salary: 0, payFrequency: 'fortnightly', housing: 0 },
      meta: { at: meta.at, by: null },
    })
    expect(state.people.map((p) => p.name)).toEqual(['Charlie'])
    expect(state.lastUpdated?.by).toBe('p1')
  })

  it('adds and removes purchases', () => {
    const purchase = {
      id: 'x2',
      personId: 'p2',
      description: 'Book',
      amount: 30,
      date: '2026-11-15',
    }
    const added = run(cloneExample(), { type: 'addPurchase', periodId: '2026-11', purchase })
    expect(periodById(added, '2026-11').purchases.map((p) => p.id)).toEqual(['x1', 'x2'])

    const removed = run(added, { type: 'removePurchase', periodId: '2026-11', purchaseId: 'x1' })
    expect(periodById(removed, '2026-11').purchases.map((p) => p.id)).toEqual(['x2'])
  })

  it('updates the card limit and the period available amount', () => {
    const state = run(cloneExample(), {
      type: 'updateCard',
      periodId: '2026-11',
      changes: { limit: 10000, available: 7000 },
    })
    expect(state.card).toEqual({ limit: 10000, splitDefault: 0.5 })
    expect(periodById(state, '2026-11').available).toBe(7000)
    expect(periodById(state, '2026-10').available).toBe(4800)
  })
})

describe('notes and savings actions', () => {
  it('toggles a note pin', () => {
    const state = run(cloneExample(), {
      type: 'updateNote',
      periodId: '2026-11',
      noteId: 'n1',
      changes: { pinned: false },
    })
    expect(periodById(state, '2026-11').notes[0].pinned).toBe(false)
    // Unpinned now, so it doesn't carry into December.
    expect(periodById(run(state, close()), '2026-12').notes).toEqual([])
  })

  it('removes a note', () => {
    const state = run(cloneExample(), { type: 'removeNote', periodId: '2026-11', noteId: 'n1' })
    expect(periodById(state, '2026-11').notes).toEqual([])
  })

  it('updates savings', () => {
    const state = run(cloneExample(), { type: 'updateSavings', changes: { goalAmount: 12000, current: 4000 } })
    expect(state.savings).toEqual({ goalName: 'Holiday', goalAmount: 12000, current: 4000, interestRate: 0.04 })
  })
})

describe('editing closed months', () => {
  it("updates a closed month's snapshot person, not the live one", () => {
    const state = run(cloneExample(), {
      type: 'updatePerson',
      id: 'p1',
      periodId: '2026-10',
      changes: { salary: 1950 },
    })
    expect(periodById(state, '2026-10').snapshot?.people[0].salary).toBe(1950)
    expect(state.people[0].salary).toBe(2000)
  })

  it('updates the live person when the period is open', () => {
    const state = run(cloneExample(), {
      type: 'updatePerson',
      id: 'p1',
      periodId: '2026-11',
      changes: { salary: 2100 },
    })
    expect(state.people[0].salary).toBe(2100)
  })

  it("updates a closed month's snapshot card limit, not the live one", () => {
    const state = run(cloneExample(), {
      type: 'updateCard',
      periodId: '2026-10',
      changes: { limit: 9000, available: 5000 },
    })
    expect(periodById(state, '2026-10').snapshot?.card.limit).toBe(9000)
    expect(periodById(state, '2026-10').available).toBe(5000)
    expect(state.card.limit).toBe(8000)
  })
})

describe('replaceState', () => {
  it("swaps in the file's data and keeps its lastUpdated", () => {
    const file = cloneExample()
    file.lastUpdated = { at: '2026-01-01T00:00:00.000Z', by: 'p2' }
    const state = run(createInitialState(new Date(2026, 10, 17)), { type: 'replaceState', data: file })
    expect(state).toEqual(file)
  })
})
