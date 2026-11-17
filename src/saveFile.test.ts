import { describe, expect, it } from 'vitest'
import { parseSaveFile } from './saveFile'
import { cloneExample, oldSaveFile } from './test/exampleData'

describe('parseSaveFile', () => {
  it('accepts the example file', () => {
    expect(parseSaveFile(JSON.stringify(cloneExample()))).toEqual({ ok: true, data: cloneExample() })
  })

  it('accepts a file from before the savings goal was removed', () => {
    expect(parseSaveFile(JSON.stringify(oldSaveFile()))).toEqual({ ok: true, data: cloneExample() })
  })

  it('explains non-JSON files', () => {
    const result = parseSaveFile('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/couldn't be read as JSON/)
  })

  it('explains files from a newer version', () => {
    const result = parseSaveFile(JSON.stringify({ ...cloneExample(), version: 2 }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/newer version/)
  })

  it('lists up to three problems with where they are', () => {
    const data = cloneExample() as unknown as Record<string, unknown>
    delete data.people
    delete data.card
    delete data.periods
    const result = parseSaveFile(JSON.stringify(data))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.details).toHaveLength(3)
      expect(result.details[0]).toMatch(/^people: /)
    }
  })
})
