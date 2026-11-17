// Asks the browser to keep this site's storage, so local storage isn't
// cleared automatically when the device runs low on space. Browsers may
// grant it silently, ask the user, or say no; the app works the same either
// way, so failures are ignored.

type StorageManagerLike = Pick<StorageManager, 'persist' | 'persisted'>

/** Resolves true if storage is (now) persistent. Never throws. */
export async function requestPersistentStorage(
  storage: StorageManagerLike | undefined = globalThis.navigator?.storage,
): Promise<boolean> {
  try {
    if (!storage?.persist) return false
    if (await storage.persisted?.()) return true
    return await storage.persist()
  } catch {
    return false
  }
}
