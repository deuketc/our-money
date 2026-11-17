// Save and Open buttons. The File System Access API is mocked; jsdom has
// no IndexedDB, so remembering the file only lasts for the session here.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { forgetFile } from './fileSave'
import { saveState, STORAGE_KEY } from './store/storage'
import { cloneExample } from './test/exampleData'

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
const win = window as unknown as Record<string, unknown>

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

describe('Save', () => {
  it('asks where to save once, then saves back to the same file', async () => {
    saveState(cloneExample())
    const { handle, writes } = fakeHandle('budget.json')
    const picker = vi.fn().mockResolvedValue(handle)
    win.showSaveFilePicker = picker
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved to budget.json.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Save/ }))

    expect(picker).toHaveBeenCalledTimes(1)
    expect(writes).toHaveLength(2)
    expect(JSON.parse(writes[1])).toEqual(stored())
  })

  it('does nothing when the save dialog is cancelled', async () => {
    saveState(cloneExample())
    win.showSaveFilePicker = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a friendly error if saving fails', async () => {
    saveState(cloneExample())
    win.showSaveFilePicker = vi.fn().mockRejectedValue(new Error('disk full'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save the file")
  })

  it('downloads a copy in browsers without the File System Access API', async () => {
    saveState(cloneExample())
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(click).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('Downloaded our-money.json')
  })
})

describe('Open', () => {
  it('loads a valid file after confirming, then saves back to it', async () => {
    const other = cloneExample()
    other.people[0].name = 'Charles'
    const { handle, writes } = fakeHandle('family.json', JSON.stringify(other))
    win.showOpenFilePicker = vi.fn().mockResolvedValue([handle])
    const savePicker = vi.fn()
    win.showSaveFilePicker = savePicker
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(await screen.findByRole('button', { name: 'Open file' }))

    expect(await screen.findByRole('article', { name: 'Charles' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Opened family.json.')
    expect(stored().people[0].name).toBe('Charles')
    expect(stored().lastUpdated).toEqual(other.lastUpdated)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(savePicker).not.toHaveBeenCalled()
    expect(writes).toHaveLength(1)
  })

  it('keeps everything when the confirmation is cancelled', async () => {
    const other = cloneExample()
    other.people[0].name = 'Charles'
    const { handle } = fakeHandle('family.json', JSON.stringify(other))
    win.showOpenFilePicker = vi.fn().mockResolvedValue([handle])
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    await screen.findByRole('dialog', { name: 'Open family.json?' })
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored().people[0].name).toBe('Charlie')
  })

  it('shows a friendly error for a file that fails validation', async () => {
    const tampered = cloneExample()
    tampered.people[0].salary = -500
    const { handle } = fakeHandle('tampered.json', JSON.stringify(tampered))
    win.showOpenFilePicker = vi.fn().mockResolvedValue([handle])
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("doesn't look like an Our Money save file")
    expect(alert).toHaveTextContent('people › 0 › salary')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored().people[0].salary).toBe(2000)
  })

  it('shows a friendly error for a file that is not JSON', async () => {
    const { handle } = fakeHandle('photo.json', 'PNG not json')
    win.showOpenFilePicker = vi.fn().mockResolvedValue([handle])
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't be read as JSON")
  })

  it('opens a file straight away from the first-run screen', async () => {
    const { handle } = fakeHandle('our-money.json', JSON.stringify(cloneExample()))
    win.showOpenFilePicker = vi.fn().mockResolvedValue([handle])
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Open it/ }))
    expect(await screen.findByRole('article', { name: 'Charlie' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not save back to a file that failed validation', async () => {
    const { handle: bad } = fakeHandle('bad.json', '{}')
    win.showOpenFilePicker = vi.fn().mockResolvedValue([bad])
    const savePicker = vi.fn().mockResolvedValue(fakeHandle('new.json').handle)
    win.showSaveFilePicker = savePicker
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(savePicker).toHaveBeenCalledTimes(1)
  })
})
