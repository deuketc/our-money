// When this browser last made a backup file. A per-browser preference in
// local storage, like "who's using Our Money": it describes this device,
// not the household's data, so it isn't part of the save file.

import { usePreference } from './usePreference'

export const LAST_BACKUP_KEY = 'our-money:last-backup'

/** The stored ISO timestamp, or null if there's none or it isn't a valid date. */
export function parseLastBackup(value: string | null): string | null {
  if (value === null || Number.isNaN(new Date(value).getTime())) return null
  return value
}

/** [last backup ISO timestamp or null, mark a backup as made at `at`]. */
export function useLastBackup(): [string | null, (at: string) => void] {
  const [stored, setStored] = usePreference(LAST_BACKUP_KEY)
  return [parseLastBackup(stored), setStored]
}
