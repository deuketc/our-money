// The app state reducer. Pure: ids, timestamps and "who" come in on the
// action, so the same action always produces the same state (and tests
// don't need to mock the clock). useAppStore fills in `meta`.

import { CURRENT_VERSION, type AppData, type Card, type Note, type Person, type Purchase, type Snapshot } from '../schema'

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
  | {
      type: 'closeMonth'
      /** The close date ("YYYY-MM-DD", normally today): ends this period and starts the next. */
      date: string
      /** Unique id for the new period. */
      nextPeriodId: string
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

    case 'closeMonth':
      return closeMonth(state, action.date, action.nextPeriodId)
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
 * Closes the current period on `date` and opens the next one.
 * - Dates: periods are date ranges, not calendar months. The closed period
 *   ends on `date` and the new one starts on that same day, with no end
 *   date until it's closed in turn. A date before the period's start (a
 *   clock set wrong) is treated as the start.
 * - Snapshot: copies of people and card as they are now, so later edits
 *   don't change this period's numbers.
 * - Carries over: people, card and pinned notes (top-level data
 *   is untouched; pinned notes are copied into the new period).
 * - Cleared: purchases and unpinned notes.
 * - The new period's available amount starts at the card limit (nothing
 *   owing) until the next statement is entered.
 */
function closeMonth(state: AppData, date: string, nextPeriodId: string): AppData {
  const current = state.periods.find((p) => p.id === state.currentPeriodId)
  if (!current || current.status !== 'open') return state
  if (state.periods.some((p) => p.id === nextPeriodId)) return state

  const end = date < current.start ? current.start : date

  const closed = {
    ...current,
    status: 'closed' as const,
    end,
    snapshot: structuredClone({ people: state.people, card: state.card }),
  }

  const opened = {
    id: nextPeriodId,
    start: end,
    end: null,
    status: 'open' as const,
    available: state.card.limit,
    purchases: [],
    notes: current.notes.filter((n) => n.pinned).map((n) => ({ ...n })),
    snapshot: null,
  }

  return {
    ...state,
    currentPeriodId: nextPeriodId,
    periods: [...state.periods.map((p) => (p.id === current.id ? closed : p)), opened],
  }
}

/** First-run state: no people, one open period starting `today` ("YYYY-MM-DD"). */
export function createInitialState(today: string, periodId: string): AppData {
  return {
    version: CURRENT_VERSION,
    people: [],
    card: { limit: 0, splitDefault: 0.5 },
    currentPeriodId: periodId,
    periods: [
      {
        id: periodId,
        start: today,
        end: null,
        status: 'open',
        available: 0,
        purchases: [],
        notes: [],
        snapshot: null,
      },
    ],
    lastUpdated: null,
  }
}
