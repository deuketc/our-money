// Back up and Restore buttons. The File System Access API is mocked; jsdom
// has no IndexedDB, so remembering the file only lasts for the session here.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { forgetFile } from './fileSave'
import { LAST_BACKUP_KEY } from './lastBackup'
import { saveState, STORAGE_KEY } from './store/storage'
import { cloneExample } from './test/exampleData'

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
const lastBackup = () => localStorage.getItem(LAST_BACKUP_KEY)
const win = window as unknown as Record<string, unknown>
const DAY_MS = 24 * 60 * 60 * 1000
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString()
/** The "Last backed up" line next to the buttons. */
const backupInfo = () => screen.getByText(/Last backed up/).closest('p') as HTMLElement

function fakeHandle(name: string, contents = '') {
  const writes: string[] = []
  return {
    writes,
    handle: {
      name,
      getFile: async () => new File([contents], name, { type: 'application/json' }),
      createWritable: async () => ({
        write: async (data: string) => {
          writes.push(data)
        },
        close: async () => {},
      }),
    },
  }
}

beforeEach(async () => {
  localStorage.clear()
  await forgetFile()
})

afterEach(() => {
  delete win.showSaveFilePicker
  delete win.showOpenFilePicker
  vi.restoreAllMocks()
})

describe('Back up', () => {
  it('asks where to save once, then backs up to the same file', async () => {
    saveState(cloneExample())
    const { handle, writes } = fakeHandle('budget.json')
    const picker = vi.fn().mockResolvedValue(handle)
    win.showSaveFilePicker = picker
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Back up' }))
    expect(await screen.findByText('Backed up to budget.json.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Back(ed)? up$/ }))

    expect(picker).toHaveBeenCalledTimes(1)
    expect(writes).toHaveLength(2)
    expect(JSON.parse(writes[1])).toEqual(stored())
  })

  it('records when the backup was made and shows it', async () => {
    saveState(cloneExample())
    win.showSaveFilePicker = vi.fn().mockResolvedValue(fakeHandle('budget.json').handle)
    const user = userEvent.setup()
    render(<App />)
    expect(within(backupInfo()).getByText('Never')).toBeInTheDocument()

    const before = Date.now()
    await user.click(screen.getByRole('button', { name: 'Back up' }))
    await screen.findByText('Backed up to budget.json.')

    expect(new Date(lastBackup()!).getTime()).toBeGreaterThanOrEqual(before)
    expect(within(backupInfo()).queryByText('Never')).not.toBeInTheDocument()
    const today = new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
    expect(within(backupInfo()).getByText(today)).toBeInTheDocument()
  })

  it('does nothing when the save dialog is cancelled', async () => {
    saveState(cloneExample())
    win.showSaveFilePicker = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Back up' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(lastBackup()).toBeNull()
  })

  it('shows a friendly error if the backup fails, and keeps the old date', async () => {
    saveState(cloneExample())
    const earlier = daysAgo(3)
    localStorage.setItem(LAST_BACKUP_KEY, earlier)
    win.showSaveFilePicker = vi.fn().mockRejectedValue(new Error('disk full'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Back up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't back up")
    expect(lastBackup()).toBe(earlier)
  })

  it('downloads a copy in browsers without the File System Access API', async () => {
    saveState(cloneExample())
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Back up' }))
    expect(click).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('Downloaded a backup, our-money.json')
    expect(lastBackup()).not.toBeNull()
  })
})

describe('backup reminder', () => {
  it('shows "Never" and no reminder before the first backup', () => {
    saveState(cloneExample())
    render(<App />)
    expect(within(backupInfo()).getByText('Never')).toBeInTheDocument()
    expect(screen.queryByText(/since your last backup/)).not.toBeInTheDocument()
  })

  it('gently reminds you after more than 14 days', () => {
    saveState(cloneExample())
    localStorage.setItem(LAST_BACKUP_KEY, daysAgo(15))
    render(<App />)
    expect(screen.getByText('It’s been 15 days since your last backup.')).toBeInTheDocument()
  })

  it('stays quiet within 14 days', () => {
    saveState(cloneExample())
    localStorage.setItem(LAST_BACKUP_KEY, daysAgo(13.9))
    render(<App />)
    expect(screen.queryByText(/since your last backup/)).not.toBeInTheDocument()
  })

  it('treats an unreadable stored date as never backed up', () => {
    saveState(cloneExample())
    localStorage.setItem(LAST_BACKUP_KEY, 'last Tuesday')
    render(<App />)
    expect(within(backupInfo()).getByText('Never')).toBeInTheDocument()
  })
})

describe('Restore', () => {
  function restoreFrom(name: string, data: unknown) {
    const file = fakeHandle(name, JSON.stringify(data))
    win.showOpenFilePicker = vi.fn().mockResolvedValue([file.handle])
    return file
  }

  const other = () => {
    const data = cloneExample()
    data.people[0].name = 'Charles'
    return data
  }

  it('warns that it will overwrite, then restores and backs up to that file', async () => {
    const { writes } = restoreFrom('family.json', other())
    const savePicker = vi.fn()
    win.showSaveFilePicker = savePicker
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    const dialog = await screen.findByRole('dialog', { name: 'Restore from family.json?' })
    expect(dialog).toHaveTextContent('This will overwrite everything in Our Money right now')
    expect(dialog).toHaveTextContent('It can’t be undone')
    expect(stored().people[0].name).toBe('Charlie') // nothing changed yet

    await user.click(within(dialog).getByRole('button', { name: 'Overwrite and restore' }))

    expect(await screen.findByRole('article', { name: 'Charles' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Restored from family.json.')
    expect(stored().people[0].name).toBe('Charles')
    expect(stored().lastUpdated).toEqual(other().lastUpdated)

    await user.click(screen.getByRole('button', { name: 'Back up' }))
    expect(savePicker).not.toHaveBeenCalled()
    expect(writes).toHaveLength(1)
  })

  it('points out changes that have never been backed up', async () => {
    restoreFrom('family.json', other())
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('You haven’t backed up yet')
  })

  it('points out changes made since the last backup', async () => {
    restoreFrom('family.json', other())
    saveState({ ...cloneExample(), lastUpdated: { at: daysAgo(1), by: 'p1' } })
    localStorage.setItem(LAST_BACKUP_KEY, daysAgo(2))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('You’ve made changes since your last backup')
  })

  it('says so when everything is already backed up', async () => {
    restoreFrom('family.json', other())
    saveState({ ...cloneExample(), lastUpdated: { at: daysAgo(2), by: 'p1' } })
    localStorage.setItem(LAST_BACKUP_KEY, daysAgo(1))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Everything here is already in your last backup.')
  })

  it('keeps everything when the confirmation is cancelled', async () => {
    restoreFrom('family.json', other())
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await screen.findByRole('dialog', { name: 'Restore from family.json?' })
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored().people[0].name).toBe('Charlie')
  })

  it('does not count as a backup', async () => {
    restoreFrom('family.json', other())
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(await screen.findByRole('button', { name: 'Overwrite and restore' }))
    await screen.findByRole('article', { name: 'Charles' })
    expect(lastBackup()).toBeNull()
  })

  it('shows a friendly error for a file that fails validation', async () => {
    const tampered = cloneExample()
    tampered.people[0].incomes[0].amount = -500
    restoreFrom('tampered.json', tampered)
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("doesn't look like an Our Money backup")
    expect(alert).toHaveTextContent('people › 0 › incomes › 0 › amount')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored().people[0].incomes[0].amount).toBe(2000)
  })

  it('shows a friendly error for a file that is not JSON', async () => {
    const { handle } = fakeHandle('photo.json', 'PNG not json')
    win.showOpenFilePicker = vi.fn().mockResolvedValue([handle])
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't be read as JSON")
  })

  it('restores straight away from the first-run screen, where there is nothing to overwrite', async () => {
    restoreFrom('our-money.json', cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Restore it/ }))
    expect(await screen.findByRole('article', { name: 'Charlie' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not back up to a file that failed validation', async () => {
    const { handle: bad } = fakeHandle('bad.json', '{}')
    win.showOpenFilePicker = vi.fn().mockResolvedValue([bad])
    const savePicker = vi.fn().mockResolvedValue(fakeHandle('new.json').handle)
    win.showSaveFilePicker = savePicker
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Back up' }))
    expect(savePicker).toHaveBeenCalledTimes(1)
  })
})
