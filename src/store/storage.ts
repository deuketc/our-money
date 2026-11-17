import { appDataSchema, type AppData } from '../schema'

export const STORAGE_KEY = 'our-money'
/** Where unreadable data is kept so autosave doesn't overwrite it. */
export const BACKUP_KEY = 'our-money:unreadable-backup'

/**
 * Loads and validates saved data. Returns null if there's nothing saved,
 * storage is unavailable, or the data is broken. Broken data is copied to
 * BACKUP_KEY first so it isn't lost when the app autosaves a fresh state.
 */
export function loadState(): AppData | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null

  try {
    const result = appDataSchema.safeParse(JSON.parse(raw))
    if (result.success) return result.data
    console.warn('Saved data failed validation', result.error.issues)
  } catch (error) {
    console.warn('Saved data is not valid JSON', error)
  }

  try {
    localStorage.setItem(BACKUP_KEY, raw)
  } catch {
    // Nothing more we can do.
  }
  return null
}

/** Saves state. Returns false if storage is unavailable or full. */
export function saveState(state: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
