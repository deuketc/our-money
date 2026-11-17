import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { appDataSchema } from '../schema'
import { todayIso } from '../format'
import { cloneExample } from '../test/exampleData'
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

  it('starts a first run with one open period from today and a unique id', () => {
    const { result } = renderHook(() => useAppStore())
    const [period] = result.current.state.periods
    expect(period.start).toBe(todayIso())
    expect(period.end).toBeNull()
    expect(period.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.current.state.currentPeriodId).toBe(period.id)
  })

  it('autosaves after every change', () => {
    saveState(cloneExample())
    const { result } = renderHook(() => useAppStore())

    act(() => {
      result.current.dispatch({ type: 'closeMonth', date: '2026-12-15', nextPeriodId: 'pd3' }, 'p1')
    })

    const saved = stored()
    expect(saved.currentPeriodId).toBe('pd3')
    expect(saved.lastUpdated.by).toBe('p1')
    expect(appDataSchema.safeParse(saved).success).toBe(true)
  })
})
