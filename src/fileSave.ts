// Saving to and opening JSON files.
//
// Chrome/Edge (File System Access API): the first Save asks where to save;
// later saves write back to that same file, even after a reload (the file
// handle is kept in IndexedDB and permission is re-asked when needed).
// Opening a file also makes it the file that Save writes to.
// Other browsers: Save downloads a copy and Open uses a normal file picker.

import { MAX_FILE_BYTES } from './saveFile'
import type { AppData } from './schema'

const FILE_TYPES = [{ description: 'Our Money data', accept: { 'application/json': ['.json'] } }]
const DEFAULT_NAME = 'our-money.json'

type PermissionMode = { mode: 'readwrite' }
interface FileHandle extends FileSystemFileHandle {
  queryPermission?: (options: PermissionMode) => Promise<PermissionState>
  requestPermission?: (options: PermissionMode) => Promise<PermissionState>
}
interface PickerWindow {
  showSaveFilePicker?: (options: { suggestedName: string; types: typeof FILE_TYPES }) => Promise<FileHandle>
  showOpenFilePicker?: (options: { types: typeof FILE_TYPES; multiple: false }) => Promise<FileHandle[]>
}
const pickers = () => window as unknown as PickerWindow

let currentHandle: FileHandle | null = null

/** For tests, and if the user wants Save to ask again. */
export async function forgetFile(): Promise<void> {
  currentHandle = null
  await storeHandle(null)
}

// ---------- Remembering the file handle (IndexedDB) ----------

const DB_NAME = 'our-money'
const STORE = 'file-handles'
const KEY = 'save-file'

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(undefined)
    try {
      const open = indexedDB.open(DB_NAME, 1)
      open.onupgradeneeded = () => open.result.createObjectStore(STORE)
      open.onerror = () => resolve(undefined)
      open.onsuccess = () => {
        try {
          const db = open.result
          const request = run(db.transaction(STORE, mode).objectStore(STORE))
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => resolve(undefined)
        } catch {
          resolve(undefined)
        }
      }
    } catch {
      resolve(undefined)
    }
  })
}

async function storeHandle(handle: FileHandle | null): Promise<void> {
  await withStore<unknown>('readwrite', (store) =>
    handle ? (store.put(handle, KEY) as IDBRequest<unknown>) : (store.delete(KEY) as IDBRequest<unknown>),
  )
}

async function rememberedHandle(): Promise<FileHandle | null> {
  currentHandle ??= ((await withStore('readonly', (store) => store.get(KEY))) as FileHandle | undefined) ?? null
  return currentHandle
}

async function canWrite(handle: FileHandle): Promise<boolean> {
  if (!handle.queryPermission) return true
  if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  return (await handle.requestPermission?.({ mode: 'readwrite' })) === 'granted'
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

// ---------- Save ----------

export type SaveResult =
  | { status: 'saved'; fileName: string }
  | { status: 'downloaded'; fileName: string }
  | { status: 'cancelled' }

export async function saveToFile(data: AppData): Promise<SaveResult> {
  const json = JSON.stringify(data, null, 2)
  const { showSaveFilePicker } = pickers()

  if (!showSaveFilePicker) {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = DEFAULT_NAME
    link.click()
    URL.revokeObjectURL(url)
    return { status: 'downloaded', fileName: DEFAULT_NAME }
  }

  try {
    let handle = await rememberedHandle()
    if (handle && !(await canWrite(handle))) handle = null
    if (!handle) {
      handle = await showSaveFilePicker({ suggestedName: DEFAULT_NAME, types: FILE_TYPES })
      currentHandle = handle
      await storeHandle(handle)
    }
    const writable = await handle.createWritable()
    await writable.write(json)
    await writable.close()
    return { status: 'saved', fileName: handle.name }
  } catch (error) {
    if (isAbort(error)) return { status: 'cancelled' }
    await forgetFile() // e.g. the file was moved: ask again next time
    throw error
  }
}

// ---------- Open ----------

export class FileTooBigError extends Error {}

/** Asks for a file and returns its text, or null if cancelled. */
export async function openFile(): Promise<{ text: string; fileName: string; remember: () => Promise<void> } | null> {
  const { showOpenFilePicker } = pickers()
  let file: File
  let handle: FileHandle | null = null

  if (showOpenFilePicker) {
    try {
      ;[handle] = await showOpenFilePicker({ types: FILE_TYPES, multiple: false })
    } catch (error) {
      if (isAbort(error)) return null
      throw error
    }
    file = await handle.getFile()
  } else {
    const picked = await pickWithInput()
    if (!picked) return null
    file = picked
  }

  if (file.size > MAX_FILE_BYTES) throw new FileTooBigError()
  return {
    text: await file.text(),
    fileName: file.name,
    // Only called once the file has been checked, so Save never writes
    // back to a file that wasn't loaded.
    remember: async () => {
      if (!handle) return
      currentHandle = handle
      await storeHandle(handle)
    },
  }
}

function pickWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
