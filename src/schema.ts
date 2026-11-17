// Zod schema for the save file (local storage and the JSON file).
// This is the single source of truth for the data types: everything else
// imports the z.infer types from here.
//
// Objects are strict (unknown keys are rejected) and cross-references are
// checked, so broken or tampered files fail to load rather than half-load.
// The one exception is fields from retired features, which are dropped
// before validation so older save files still load (see dropRetiredFields).

import { z } from 'zod'

const id = z.string().min(1).max(64)
const money = z.number() // Zod rejects NaN and ±Infinity by default
const amount = money.nonnegative()
const isoDate = z.iso.date() // "YYYY-MM-DD"
const periodId = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected "YYYY-MM"')

export const payFrequencySchema = z.enum(['weekly', 'fortnightly', 'monthly', 'yearly'])

export const personSchema = z.strictObject({
  id,
  name: z.string().trim().min(1).max(100),
  salary: amount,
  payFrequency: payFrequencySchema,
  housing: amount,
})

export const cardSchema = z.strictObject({
  limit: amount,
  /** First person's share of shared spend when there are exactly two people. */
  splitDefault: z.number().min(0).max(1),
})

export const purchaseSchema = z.strictObject({
  id,
  personId: id,
  description: z.string().max(200),
  amount,
  date: isoDate,
})

export const noteSchema = z.strictObject({
  id,
  text: z.string().min(1).max(1000),
  date: isoDate,
  pinned: z.boolean(),
})

export const snapshotSchema = z.strictObject({
  people: z.array(personSchema),
  card: cardSchema,
})

export const periodSchema = z.strictObject({
  id: periodId,
  start: isoDate,
  end: isoDate,
  status: z.enum(['open', 'closed']),
  available: amount,
  purchases: z.array(purchaseSchema),
  notes: z.array(noteSchema),
  /** People and card as they were at close; null while open. */
  snapshot: snapshotSchema.nullable(),
})

export const lastUpdatedSchema = z.strictObject({
  at: z.iso.datetime({ offset: true }),
  /** Person id of whoever made the change; null if unknown. */
  by: id.nullable(),
})

/**
 * Removes fields left by features that no longer exist, so files saved by
 * older versions of the app still pass the strict schema:
 * - `savings` (top level) and `savedToSavings` (each period), from the
 *   retired savings goal.
 * Anything not shaped like a save file passes through for the schema to reject.
 */
export function dropRetiredFields(input: unknown): unknown {
  if (!isPlainObject(input)) return input
  const { savings: _savings, ...rest } = input
  if (!Array.isArray(rest.periods)) return rest
  return {
    ...rest,
    periods: rest.periods.map((period: unknown) => {
      if (!isPlainObject(period)) return period
      const { savedToSavings: _saved, ...kept } = period
      return kept
    }),
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const appDataObjectSchema = z
  .strictObject({
    version: z.literal(1),
    people: z.array(personSchema),
    card: cardSchema,
    currentPeriodId: periodId,
    periods: z.array(periodSchema).min(1),
    lastUpdated: lastUpdatedSchema.nullable(),
  })
  .superRefine((data, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path })

    const duplicates = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i)

    for (const dup of duplicates(data.people.map((p) => p.id))) {
      issue(`Duplicate person id "${dup}"`, ['people'])
    }
    for (const dup of duplicates(data.periods.map((p) => p.id))) {
      issue(`Duplicate period id "${dup}"`, ['periods'])
    }

    const current = data.periods.find((p) => p.id === data.currentPeriodId)
    if (!current) issue('currentPeriodId does not match any period', ['currentPeriodId'])
    else if (current.status !== 'open') issue('Current period must be open', ['currentPeriodId'])

    const openCount = data.periods.filter((p) => p.status === 'open').length
    if (openCount !== 1) issue(`Expected exactly one open period, found ${openCount}`, ['periods'])

    data.periods.forEach((period, i) => {
      if (period.start > period.end) issue('Period starts after it ends', ['periods', i])

      if (period.status === 'closed' && period.snapshot === null) {
        issue('Closed period is missing its snapshot', ['periods', i, 'snapshot'])
      }
      if (period.status === 'open' && period.snapshot !== null) {
        issue('Open period should not have a snapshot', ['periods', i, 'snapshot'])
      }

      // Purchases must belong to someone who exists in that period.
      const people = period.snapshot?.people ?? data.people
      const personIds = new Set(people.map((p) => p.id))
      period.purchases.forEach((purchase, j) => {
        if (!personIds.has(purchase.personId)) {
          issue(`Unknown person "${purchase.personId}"`, ['periods', i, 'purchases', j, 'personId'])
        }
      })
    })

    if (data.lastUpdated?.by != null && !data.people.some((p) => p.id === data.lastUpdated?.by)) {
      issue(`Unknown person "${data.lastUpdated.by}"`, ['lastUpdated', 'by'])
    }
  })

export const appDataSchema = z.preprocess(dropRetiredFields, appDataObjectSchema)

export type PayFrequency = z.infer<typeof payFrequencySchema>
export type Person = z.infer<typeof personSchema>
export type Card = z.infer<typeof cardSchema>
export type Purchase = z.infer<typeof purchaseSchema>
export type Note = z.infer<typeof noteSchema>
export type Snapshot = z.infer<typeof snapshotSchema>
export type Period = z.infer<typeof periodSchema>
export type LastUpdated = z.infer<typeof lastUpdatedSchema>
export type AppData = z.output<typeof appDataSchema>
