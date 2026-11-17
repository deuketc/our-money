import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cloneExample } from '../test/exampleData'
import { BACKUP_KEY, loadState, saveState, STORAGE_KEY } from './storage'

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('storage', () => {
  it('returns null when nothing is saved', () => {
    expect(loadState()).toBeNull()
  })

  it('round-trips saved data', () => {
    expect(saveState(cloneExample())).toBe(true)
    expect(loadState()).toEqual(cloneExample())
  })

  it('backs up and ignores data that is not JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState()).toBeNull()
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{not json')
  })

  it('backs up and ignores data that fails validation', () => {
    const bad = JSON.stringify({ ...cloneExample(), version: 99 })
    localStorage.setItem(STORAGE_KEY, bad)
    expect(loadState()).toBeNull()
    expect(localStorage.getItem(BACKUP_KEY)).toBe(bad)
  })
})
