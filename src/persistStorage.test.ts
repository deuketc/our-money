import { describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './persistStorage'

describe('requestPersistentStorage', () => {
  it('asks the browser to keep the data', async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(true) }
    expect(await requestPersistentStorage(storage)).toBe(true)
    expect(storage.persist).toHaveBeenCalledTimes(1)
  })

  it("doesn't ask again when storage is already persistent", async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(true), persist: vi.fn() }
    expect(await requestPersistentStorage(storage)).toBe(true)
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('reports a refusal', async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(false) }
    expect(await requestPersistentStorage(storage)).toBe(false)
  })

  it('copes with browsers that lack the Storage API or throw', async () => {
    expect(await requestPersistentStorage(undefined)).toBe(false)
    const throwing = { persisted: vi.fn().mockRejectedValue(new Error('nope')), persist: vi.fn() }
    expect(await requestPersistentStorage(throwing)).toBe(false)
  })
})
