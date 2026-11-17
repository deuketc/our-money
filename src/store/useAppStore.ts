import { useCallback, useEffect, useReducer } from 'react'
import { createInitialState, reducer, type Action } from './reducer'
import { loadState, saveState } from './storage'

function init() {
  return loadState() ?? createInitialState(new Date())
}

/**
 * App state, loaded from local storage on startup and autosaved after every
 * change. `dispatch(action, by)` stamps the change with the current time and
 * the person making it (lastUpdated).
 */
export function useAppStore() {
  const [state, rawDispatch] = useReducer(reducer, undefined, init)

  useEffect(() => {
    saveState(state)
  }, [state])

  const dispatch = useCallback((action: Action, by: string | null = null) => {
    rawDispatch({ ...action, meta: { at: new Date().toISOString(), by } })
  }, [])

  return { state, dispatch }
}
