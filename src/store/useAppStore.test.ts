import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { appDataSchema } from '../schema'
import { cloneExample, oldSaveFile } from '../test/exampleData'
import { STORAGE_KEY, saveState } from './storage'
import { useAppStore } from './useAppStore'

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')

beforeEach(() => {
  localStorage.clear()
})

describe('useAppStore', () => {
  it('starts empty on first run and saves that state', () => {
    const { result } = renderHook(() => useAppStore())
    expect(result.current.state.people).toEqual([])
    expect(appDataSchema.safeParse(stored()).success).toBe(true)
  })

  it('loads saved data on startup', () => {
    saveState(cloneExample())
    const { result } = renderHook(() => useAppStore())
    expect(result.current.state).toEqual(cloneExample())
  })

  it('loads older saved data and drops the retired savings fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldSaveFile()))
    const { result } = renderHook(() => useAppStore())
    expect(result.current.state).toEqual(cloneExample())
    expect(stored().savings).toBeUndefined()
    expect(stored().periods[0]).not.toHaveProperty('savedToSavings')
  })

  it('autosaves after every change', () => {
    saveState(cloneExample())
    const { result } = renderHook(() => useAppStore())

    act(() => {
      result.current.dispatch({ type: 'closeMonth' }, 'p1')
    })

    const saved = stored()
    expect(saved.currentPeriodId).toBe('2026-12')
    expect(saved.lastUpdated.by).toBe('p1')
    expect(appDataSchema.safeParse(saved).success).toBe(true)
  })
})
