// The app state reducer. Pure: ids, timestamps and "who" come in on the
// action, so the same action always produces the same state (and tests
// don't need to mock the clock). useAppStore fills in `meta`.

import type { AppData, Card, Note, Person, Purchase, Savings, Snapshot } from '../schema'

export type Action =
  | { type: 'addPerson'; person: Person }
  | {
      type: 'updatePerson'
      id: string
      changes: Partial<Omit<Person, 'id'>>
      /** A closed period: edits its snapshot instead of the live person. */
      periodId?: string
    }
  | { type: 'addPurchase'; periodId: string; purchase: Purchase }
  | { type: 'removePurchase'; periodId: string; purchaseId: string }
  | {
      type: 'updateCard'
      /**
       * limit and splitDefault are live values, except for a closed period
       * where they edit its snapshot. available always belongs to the period.
       */
      changes: Partial<Card> & { available?: number }
      periodId: string
    }
  | {
      /** Opening a saved file. Keeps the file's own lastUpdated. */
      type: 'replaceState'
      data: AppData
    }
  | { type: 'addNote'; periodId: string; note: Note }
  | { type: 'updateNote'; periodId: string; noteId: string; changes: Partial<Omit<Note, 'id'>> }
  | { type: 'removeNote'; periodId: string; noteId: string }
  | { type: 'updateSavings'; changes: Partial<Savings> }
  | {
      type: 'closeMonth'
      /** Leftover to add to savings (editable by the user); null to skip. */
      savedToSavings: number | null
    }

export interface Meta {
  /** ISO timestamp of the change. */
  at: string
  /** Person id making the change, if known. */
  by: string | null
}

export type StoreAction = Action & { meta: Meta }

export function reducer(state: AppData, action: StoreAction): AppData {
  if (action.type === 'replaceState') return action.data
  const next = apply(state, action)
  if (next === state) return state
  const by = action.meta.by ?? (action.type === 'addPerson' ? action.person.id : null)
  return { ...next, lastUpdated: { at: action.meta.at, by } }
}

function apply(state: AppData, action: Exclude<Action, { type: 'replaceState' }>): AppData {
  switch (action.type) {
    case 'addPerson':
      if (state.people.some((p) => p.id === action.person.id)) return state
      return { ...state, people: [...state.people, action.person] }

    case 'updatePerson': {
      const edit = (people: Person[]) =>
        people.map((p) => (p.id === action.id ? { ...p, ...action.changes } : p))
      if (action.periodId && snapshotOf(state, action.periodId)) {
        return updateSnapshot(state, action.periodId, (s) => ({ ...s, people: edit(s.people) }))
      }
      return { ...state, people: edit(state.people) }
    }

    case 'addPurchase':
      return updatePeriod(state, action.periodId, (period) => ({
        ...period,
        purchases: [...period.purchases, action.purchase],
      }))

    case 'removePurchase':
      return updatePeriod(state, action.periodId, (period) => ({
        ...period,
        purchases: period.purchases.filter((p) => p.id !== action.purchaseId),
      }))

    case 'updateCard': {
      const { available, ...cardChanges } = action.changes
      const withCard = snapshotOf(state, action.periodId)
        ? updateSnapshot(state, action.periodId, (s) => ({ ...s, card: { ...s.card, ...cardChanges } }))
        : { ...state, card: { ...state.card, ...cardChanges } }
      if (available === undefined) return withCard
      return updatePeriod(withCard, action.periodId, (period) => ({ ...period, available }))
    }

    case 'addNote':
      return updatePeriod(state, action.periodId, (period) => ({
        ...period,
        notes: [...period.notes, action.note],
      }))

    case 'updateNote':
      return updatePeriod(state, action.periodId, (period) => ({
        ...period,
        notes: period.notes.map((n) => (n.id === action.noteId ? { ...n, ...action.changes } : n)),
      }))

    case 'removeNote':
      return updatePeriod(state, action.periodId, (period) => ({
        ...period,
        notes: period.notes.filter((n) => n.id !== action.noteId),
      }))

    case 'updateSavings':
      return { ...state, savings: { ...state.savings, ...action.changes } }

    case 'closeMonth':
      return closeMonth(state, action.savedToSavings)
  }
}

function snapshotOf(state: AppData, periodId: string): Snapshot | null {
  return state.periods.find((p) => p.id === periodId)?.snapshot ?? null
}

function updateSnapshot(state: AppData, periodId: string, update: (s: Snapshot) => Snapshot): AppData {
  return updatePeriod(state, periodId, (period) =>
    period.snapshot ? { ...period, snapshot: update(period.snapshot) } : period,
  )
}

function updatePeriod(
  state: AppData,
  periodId: string,
  update: (period: AppData['periods'][number]) => AppData['periods'][number],
): AppData {
  if (!state.periods.some((p) => p.id === periodId)) return state
  return {
    ...state,
    periods: state.periods.map((p) => (p.id === periodId ? update(p) : p)),
  }
}

/**
 * Closes the current period and opens the next one.
 * - Snapshot: copies of people and card as they are now, so later edits
 *   don't change this month's numbers.
 * - Carries over: people, card, savings and pinned notes (top-level data
 *   is untouched; pinned notes are copied into the new period).
 * - Cleared: purchases and unpinned notes.
 * - The new period starts the day after this one ends and runs one month.
 *   Its available amount starts at the card limit (nothing owing) until
 *   the next statement is entered.
 */
function closeMonth(state: AppData, savedToSavings: number | null): AppData {
  const current = state.periods.find((p) => p.id === state.currentPeriodId)
  if (!current || current.status !== 'open') return state

  const { start, end } = nextPeriodDates(current.end)
  const nextId = start.slice(0, 7)
  if (state.periods.some((p) => p.id === nextId)) return state

  const closed = {
    ...current,
    status: 'closed' as const,
    savedToSavings,
    snapshot: structuredClone({ people: state.people, card: state.card }),
  }

  const opened = {
    id: nextId,
    start,
    end,
    status: 'open' as const,
    available: state.card.limit,
    purchases: [],
    notes: current.notes.filter((n) => n.pinned).map((n) => ({ ...n })),
    savedToSavings: null,
    snapshot: null,
  }

  return {
    ...state,
    savings: {
      ...state.savings,
      current: state.savings.current + (savedToSavings ?? 0),
    },
    currentPeriodId: nextId,
    periods: [...state.periods.map((p) => (p.id === current.id ? closed : p)), opened],
  }
}

// ---------- Dates ----------
// Dates are "YYYY-MM-DD" strings handled in UTC so time zones and daylight
// saving can't shift them.

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: string, days: number): string {
  const d = parseDate(date)
  d.setUTCDate(d.getUTCDate() + days)
  return formatDate(d)
}

/** Same day next month, clamped to the month's length (31 Jan → 28 Feb). */
function addOneMonth(date: string): string {
  const d = parseDate(date)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return formatDate(new Date(Date.UTC(year, month, Math.min(d.getUTCDate(), lastDay))))
}

/** The period after one ending on `previousEnd`: starts the next day, runs one month. */
export function nextPeriodDates(previousEnd: string): { start: string; end: string } {
  const start = addDays(previousEnd, 1)
  return { start, end: addDays(addOneMonth(start), -1) }
}

/** First-run state: no people, one open period starting today. */
export function createInitialState(today: Date): AppData {
  const start = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  const end = addDays(addOneMonth(start), -1)
  return {
    version: 1,
    people: [],
    card: { limit: 0, splitDefault: 0.5 },
    savings: { goalName: '', goalAmount: 0, current: 0, interestRate: 0 },
    currentPeriodId: start.slice(0, 7),
    periods: [
      {
        id: start.slice(0, 7),
        start,
        end,
        status: 'open',
        available: 0,
        purchases: [],
        notes: [],
        savedToSavings: null,
        snapshot: null,
      },
    ],
    lastUpdated: null,
  }
}
