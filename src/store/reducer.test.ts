import { describe, expect, it } from 'vitest'
import { calculatePeriod } from '../calculations'
import { appDataSchema, type AppData } from '../schema'
import { cloneExample } from '../test/exampleData'
import { createInitialState, createPerson, reducer, type Action, type Meta } from './reducer'

const meta: Meta = { at: '2026-12-15T08:00:00.000Z', by: 'p2' }
const run = (state: AppData, ...actions: Action[]) =>
  actions.reduce((s, action) => reducer(s, { ...action, meta }), state)

/** Close the current period on `date`, opening `nextPeriodId`. */
const close = (date = '2026-12-15', nextPeriodId = 'pd3'): Action => ({ type: 'closeMonth', date, nextPeriodId })

const periodById = (state: AppData, id: string) => {
  const period = state.periods.find((p) => p.id === id)
  if (!period) throw new Error(`No period ${id}`)
  return period
}

describe('closeMonth', () => {
  it('closes the open period and opens a new one with the given id', () => {
    const state = run(cloneExample(), close())

    expect(periodById(state, 'pd2').status).toBe('closed')
    expect(state.currentPeriodId).toBe('pd3')
    expect(periodById(state, 'pd3').status).toBe('open')
    expect(state.periods.map((p) => p.id)).toEqual(['pd1', 'pd2', 'pd3'])
  })

  it('ends the period on the close date and starts the next one that same day', () => {
    const state = run(cloneExample(), close('2026-12-15'))
    const closed = periodById(state, 'pd2')
    const opened = periodById(state, 'pd3')

    expect(closed.start).toBe('2026-11-05')
    expect(closed.end).toBe('2026-12-15')
    expect(opened.start).toBe('2026-12-15')
    expect(opened.end).toBeNull()
  })

  it('can close on the day the period started', () => {
    const state = run(cloneExample(), close('2026-11-05'))
    expect(periodById(state, 'pd2')).toMatchObject({ start: '2026-11-05', end: '2026-11-05' })
    expect(periodById(state, 'pd3')).toMatchObject({ start: '2026-11-05', end: null })
    expect(appDataSchema.safeParse(state).success).toBe(true)
  })

  it('treats a close date before the start (a wrong clock) as the start', () => {
    const state = run(cloneExample(), close('2026-10-01'))
    expect(periodById(state, 'pd2').end).toBe('2026-11-05')
    expect(periodById(state, 'pd3').start).toBe('2026-11-05')
  })

  it('ignores a new period id that is already taken', () => {
    const before = cloneExample()
    expect(run(before, close('2026-12-15', 'pd1'))).toBe(before)
  })

  it('snapshots people and card as they were at close', () => {
    const state = run(cloneExample(), close())
    expect(periodById(state, 'pd2').snapshot).toEqual({
      people: cloneExample().people,
      card: cloneExample().card,
    })
  })

  it("keeps the closed period's numbers after a pay rise", () => {
    const closed = run(cloneExample(), close())
    const before = calculatePeriod(closed, periodById(closed, 'pd2'))

    const afterRaise = run(
      closed,
      { type: 'updateLine', personId: 'p1', list: 'incomes', lineId: 'i1', changes: { amount: 2500 } },
      { type: 'updateCard', periodId: 'pd3', changes: { limit: 10000 } },
    )
    const november = periodById(afterRaise, 'pd2')

    expect(afterRaise.people[0].incomes[0].amount).toBe(2500)
    expect(november.snapshot?.people[0].incomes[0].amount).toBe(2000)
    expect(november.snapshot?.card.limit).toBe(8000)
    expect(calculatePeriod(afterRaise, november)).toEqual(before)
    expect(before.summary.balance).toBeCloseTo(3900, 2)
  })

  it('carries over people and card', () => {
    const before = cloneExample()
    const state = run(before, close())
    expect(state.people).toEqual(before.people)
    expect(state.card).toEqual(before.card)
  })

  it('clears purchases and starts available at the card limit', () => {
    const next = periodById(run(cloneExample(), close()), 'pd3')
    expect(next.purchases).toEqual([])
    expect(next.available).toBe(8000)
  })

  it('carries pinned notes forward and drops unpinned ones', () => {
    const state = run(
      cloneExample(),
      {
        type: 'addNote',
        periodId: 'pd2',
        note: { id: 'n2', text: 'Pay the plumber', date: '2026-11-20', pinned: false },
      },
      close(),
    )

    expect(periodById(state, 'pd2').notes.map((n) => n.text)).toEqual(['Car rego due in March', 'Pay the plumber'])
    expect(periodById(state, 'pd3').notes.map((n) => n.text)).toEqual(['Car rego due in March'])
  })

  it('stamps lastUpdated', () => {
    expect(run(cloneExample(), close()).lastUpdated).toEqual({
      at: meta.at,
      by: 'p2',
    })
  })

  it('produces a valid save file', () => {
    const state = run(cloneExample(), close('2026-12-15', 'pd3'), close('2027-01-14', 'pd4'))
    expect(appDataSchema.safeParse(state).success).toBe(true)
    expect(state.currentPeriodId).toBe('pd4')
    expect(periodById(state, 'pd3')).toMatchObject({ start: '2026-12-15', end: '2027-01-14' })
  })

  it('works on a first-run state with nobody added yet', () => {
    const initial = createInitialState('2026-11-17', 'pd0')
    const state = reducer(initial, { ...close('2026-12-17', 'pd1'), meta: { at: meta.at, by: null } })
    expect(state.currentPeriodId).toBe('pd1')
    expect(periodById(state, 'pd0')).toMatchObject({ start: '2026-11-17', end: '2026-12-17' })
    expect(periodById(state, 'pd0').snapshot).toEqual({ people: [], card: initial.card })
    expect(appDataSchema.safeParse(state).success).toBe(true)
  })

  it('does not change the input state', () => {
    const before = cloneExample()
    run(before, close())
    expect(before).toEqual(cloneExample())
  })
})

describe('createInitialState', () => {
  it('starts one open period on the given day, with the given id and no end date', () => {
    const state = createInitialState('2026-11-17', 'pd0')
    expect(state.currentPeriodId).toBe('pd0')
    expect(state.periods).toEqual([
      {
        id: 'pd0',
        start: '2026-11-17',
        end: null,
        status: 'open',
        available: 0,
        purchases: [],
        notes: [],
        snapshot: null,
      },
    ])
    expect(appDataSchema.safeParse(state).success).toBe(true)
  })
})

describe('other actions', () => {
  it('adds a person and credits them as the updater on first run', () => {
    const state = reducer(createInitialState('2026-11-17', 'pd0'), {
      type: 'addPerson',
      person: createPerson({ id: 'p1', salaryLineId: 'i1', housingLineId: 'e1' }, 'Charlie'),
      meta: { at: meta.at, by: null },
    })
    expect(state.people.map((p) => p.name)).toEqual(['Charlie'])
    expect(state.lastUpdated?.by).toBe('p1')
    expect(appDataSchema.safeParse(state).success).toBe(true)
  })

  it('starts a new person with a "Salary" income line and a "Housing" expense line', () => {
    expect(createPerson({ id: 'p9', salaryLineId: 'a', housingLineId: 'b' }, 'Sam')).toEqual({
      id: 'p9',
      name: 'Sam',
      incomes: [{ id: 'a', name: 'Salary', amount: 0, frequency: 'fortnightly' }],
      expenses: [{ id: 'b', name: 'Housing', amount: 0, frequency: 'monthly' }],
    })
  })

  it('adds and removes purchases', () => {
    const purchase = {
      id: 'x2',
      personId: 'p2',
      description: 'Book',
      amount: 30,
      date: '2026-11-15',
    }
    const added = run(cloneExample(), { type: 'addPurchase', periodId: 'pd2', purchase })
    expect(periodById(added, 'pd2').purchases.map((p) => p.id)).toEqual(['x1', 'x2'])

    const removed = run(added, { type: 'removePurchase', periodId: 'pd2', purchaseId: 'x1' })
    expect(periodById(removed, 'pd2').purchases.map((p) => p.id)).toEqual(['x2'])
  })

  it('updates the card limit and the period available amount', () => {
    const state = run(cloneExample(), {
      type: 'updateCard',
      periodId: 'pd2',
      changes: { limit: 10000, available: 7000 },
    })
    expect(state.card).toEqual({ limit: 10000, splitDefault: 0.5 })
    expect(periodById(state, 'pd2').available).toBe(7000)
    expect(periodById(state, 'pd1').available).toBe(4800)
  })
})

describe('notes actions', () => {
  it('toggles a note pin', () => {
    const state = run(cloneExample(), {
      type: 'updateNote',
      periodId: 'pd2',
      noteId: 'n1',
      changes: { pinned: false },
    })
    expect(periodById(state, 'pd2').notes[0].pinned).toBe(false)
    // Unpinned now, so it doesn't carry into December.
    expect(periodById(run(state, close()), 'pd3').notes).toEqual([])
  })

  it('removes a note', () => {
    const state = run(cloneExample(), { type: 'removeNote', periodId: 'pd2', noteId: 'n1' })
    expect(periodById(state, 'pd2').notes).toEqual([])
  })
})

describe('income and expense lines', () => {
  const sideJob = { id: 'i3', name: 'Side job', amount: 100, frequency: 'weekly' as const }

  it('adds an income line', () => {
    const state = run(cloneExample(), { type: 'addLine', personId: 'p1', list: 'incomes', line: sideJob })
    expect(state.people[0].incomes.map((l) => l.name)).toEqual(['Salary', 'Side job'])
    expect(state.people[0].expenses).toHaveLength(1)
    expect(appDataSchema.safeParse(state).success).toBe(true)
  })

  it('adds an expense line', () => {
    const insurance = { id: 'e3', name: 'Car insurance', amount: 600, frequency: 'yearly' as const }
    const state = run(cloneExample(), { type: 'addLine', personId: 'p2', list: 'expenses', line: insurance })
    expect(state.people[1].expenses.map((l) => l.name)).toEqual(['Housing', 'Car insurance'])
  })

  it('ignores a line id that is already taken', () => {
    const before = cloneExample()
    const taken = { ...sideJob, id: 'i1' }
    expect(run(before, { type: 'addLine', personId: 'p1', list: 'incomes', line: taken })).toBe(before)
  })

  it("updates a line's name, amount and frequency", () => {
    const state = run(cloneExample(), {
      type: 'updateLine',
      personId: 'p2',
      list: 'expenses',
      lineId: 'e2',
      changes: { name: 'Rent', amount: 300, frequency: 'weekly' },
    })
    expect(state.people[1].expenses).toEqual([{ id: 'e2', name: 'Rent', amount: 300, frequency: 'weekly' }])
    expect(state.people[0].expenses[0].name).toBe('Housing')
  })

  it('removes a line', () => {
    const added = run(cloneExample(), { type: 'addLine', personId: 'p1', list: 'incomes', line: sideJob })
    const state = run(added, { type: 'removeLine', personId: 'p1', list: 'incomes', lineId: 'i1' })
    expect(state.people[0].incomes.map((l) => l.id)).toEqual(['i3'])
  })

  it('copies the lines into the snapshot when the period closes', () => {
    const state = run(
      cloneExample(),
      { type: 'addLine', personId: 'p1', list: 'incomes', line: sideJob },
      close(),
    )
    expect(periodById(state, 'pd2').snapshot?.people[0].incomes).toEqual(state.people[0].incomes)
    expect(periodById(state, 'pd2').snapshot?.people[0].expenses).toEqual(state.people[0].expenses)
    // A copy, not the same array: later live edits don't reach the snapshot.
    expect(periodById(state, 'pd2').snapshot?.people[0].incomes).not.toBe(state.people[0].incomes)
  })
})

describe('editing closed periods', () => {
  it("updates a closed period's snapshot lines, not the live ones", () => {
    const state = run(cloneExample(), {
      type: 'updateLine',
      personId: 'p1',
      list: 'incomes',
      lineId: 'i1',
      changes: { amount: 1950 },
      periodId: 'pd1',
    })
    expect(periodById(state, 'pd1').snapshot?.people[0].incomes[0].amount).toBe(1950)
    expect(state.people[0].incomes[0].amount).toBe(2000)
  })

  it('adds and removes lines in a closed period without touching the live person', () => {
    const extra = { id: 'e9', name: 'Gym', amount: 15, frequency: 'weekly' as const }
    const added = run(cloneExample(), { type: 'addLine', personId: 'p1', list: 'expenses', line: extra, periodId: 'pd1' })
    expect(periodById(added, 'pd1').snapshot?.people[0].expenses.map((l) => l.id)).toEqual(['e1', 'e9'])
    expect(added.people[0].expenses.map((l) => l.id)).toEqual(['e1'])

    const removed = run(added, { type: 'removeLine', personId: 'p1', list: 'expenses', lineId: 'e1', periodId: 'pd1' })
    expect(periodById(removed, 'pd1').snapshot?.people[0].expenses.map((l) => l.id)).toEqual(['e9'])
    expect(removed.people[0].expenses.map((l) => l.id)).toEqual(['e1'])
  })

  it('updates the live person when the period is open', () => {
    const state = run(cloneExample(), {
      type: 'updateLine',
      personId: 'p1',
      list: 'incomes',
      lineId: 'i1',
      changes: { amount: 2100 },
      periodId: 'pd2',
    })
    expect(state.people[0].incomes[0].amount).toBe(2100)
  })

  it('renames the live person', () => {
    const state = run(cloneExample(), { type: 'updatePerson', id: 'p1', changes: { name: 'Charles' } })
    expect(state.people[0].name).toBe('Charles')
  })

  it("updates a closed period's snapshot card limit, not the live one", () => {
    const state = run(cloneExample(), {
      type: 'updateCard',
      periodId: 'pd1',
      changes: { limit: 9000, available: 5000 },
    })
    expect(periodById(state, 'pd1').snapshot?.card.limit).toBe(9000)
    expect(periodById(state, 'pd1').available).toBe(5000)
    expect(state.card.limit).toBe(8000)
  })
})

describe('replaceState', () => {
  it("swaps in the file's data and keeps its lastUpdated", () => {
    const file = cloneExample()
    file.lastUpdated = { at: '2026-01-01T00:00:00.000Z', by: 'p2' }
    const state = run(createInitialState('2026-11-17', 'pd0'), { type: 'replaceState', data: file })
    expect(state).toEqual(file)
  })
})
