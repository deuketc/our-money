import { useState } from 'react'

/**
 * A small per-browser setting kept in localStorage (e.g. who's using this
 * device). Falls back to in-memory if storage is unavailable.
 */
export function usePreference(key: string): [string | null, (value: string | null) => void] {
  const [value, setValue] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  })

  const update = (next: string | null) => {
    setValue(next)
    try {
      if (next === null) localStorage.removeItem(key)
      else localStorage.setItem(key, next)
    } catch {
      // Keep the in-memory value only.
    }
  }

  return [value, update]
}
