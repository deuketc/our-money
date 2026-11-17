import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { saveState, STORAGE_KEY } from './store/storage'
import { cloneExample } from './test/exampleData'

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
const hero = () => screen.getByRole('region', { name: 'Balance' })
const card = (name: string) => screen.getByRole('article', { name })
const leftOver = (name: string) => within(card(name)).getByRole('region', { name: `${name} left over` })

beforeEach(() => {
  localStorage.clear()
})

describe('first run', () => {
  it('asks you to add yourself, then shows your card', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Our Money' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add yourself to get started' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Your name'), 'Charlie')
    await user.click(screen.getByRole('button', { name: "Let's go" }))

    expect(card('Charlie')).toBeInTheDocument()
    expect(hero()).toHaveTextContent('Left over')
    expect(stored().people).toEqual([expect.objectContaining({ name: 'Charlie' })])
    expect(stored().lastUpdated.by).toBe(stored().people[0].id)
  })

  it("won't add a blank name", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Your name'), '   ')
    expect(screen.getByRole('button', { name: "Let's go" })).toBeDisabled()
  })
})

describe('with the example data', () => {
  beforeEach(() => {
    saveState(cloneExample())
  })

  it('shows the household balance in the green', () => {
    render(<App />)
    expect(hero()).toHaveTextContent('$3,900')
    expect(hero()).toHaveTextContent("You're in the green")
    expect(leftOver('Charlie')).toHaveTextContent('$1,683.33')
    expect(leftOver('Layla')).toHaveTextContent('$2,216.67')
  })

  it('shows calculated Visa amounts as plain text', () => {
    render(<App />)
    const charlie = within(card('Charlie'))
    expect(charlie.getByText('Total Visa owing').closest('div')?.parentElement).toHaveTextContent('$1,450')
    expect(charlie.getByText('50% of $2,700 shared')).toBeInTheDocument()
    expect(charlie.getByRole('list', { name: "Charlie's personal purchases" })).toHaveTextContent('PlayStation game')
  })

  it('turns red when the money runs out', async () => {
    const user = userEvent.setup()
    render(<App />)
    const salary = within(card('Charlie')).getByLabelText('Salary')
    await user.clear(salary)
    await user.clear(within(card('Layla')).getByLabelText('Salary'))

    expect(hero()).toHaveTextContent("You're in the red")
    expect(hero()).toHaveTextContent('-$5,200')
    expect(stored().people[0].salary).toBe(0)
  })

  it('updates salary and pay frequency', async () => {
    const user = userEvent.setup()
    render(<App />)
    const charlie = within(card('Charlie'))
    await user.selectOptions(charlie.getByLabelText('Pay frequency'), 'monthly')

    expect(stored().people[0].payFrequency).toBe('monthly')
    // $2,000 monthly: 2000 − 1200 − 1450
    expect(leftOver('Charlie')).toHaveTextContent('-$650')
    expect(stored().lastUpdated.by).toBe('p1')
  })

  it('adds and removes a personal purchase', async () => {
    const user = userEvent.setup()
    render(<App />)
    const layla = within(card('Layla'))
    const form = within(layla.getByRole('form', { name: 'Add a purchase for Layla' }))

    await user.type(form.getByPlaceholderText('What was it?'), 'Book')
    await user.type(form.getByLabelText('Amount'), '30')
    await user.click(form.getByRole('button', { name: 'Add' }))

    expect(layla.getByRole('list', { name: "Layla's personal purchases" })).toHaveTextContent('Book')
    // Shared drops to 2,670, so Layla owes 1,335 + 30.
    expect(layla.getByText('Total Visa owing').closest('div')?.parentElement).toHaveTextContent('$1,365')
    expect(stored().periods[1].purchases).toHaveLength(2)

    await user.click(layla.getByRole('button', { name: 'Remove Book' }))
    expect(layla.queryByRole('list')).not.toBeInTheDocument()
    expect(stored().periods[1].purchases).toHaveLength(1)
  })

  it('renames a person without saving a blank name', async () => {
    const user = userEvent.setup()
    render(<App />)
    const name = within(card('Charlie')).getByLabelText('Name')
    await user.clear(name)
    await user.tab()
    expect(stored().people[0].name).toBe('Charlie')

    await user.type(within(card('Charlie')).getByLabelText('Name'), 'Charles{Enter}')
    expect(stored().people[0].name).toBe('CharlieCharles')
  })


  it('adds a second person', async () => {
    saveState({ ...cloneExample(), people: [cloneExample().people[0]], periods: [cloneExample().periods[1]] })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    await user.type(screen.getByLabelText('Their name'), 'Layla')
    await user.click(screen.getByRole('button', { name: 'Add to budget' }))

    expect(card('Layla')).toBeInTheDocument()
    expect(stored().people.map((p: { name: string }) => p.name)).toEqual(['Charlie', 'Layla'])
  })
})

describe('Visa, notes and closing the month', () => {
  beforeEach(() => {
    saveState(cloneExample())
  })

  const section = (name: string) => within(screen.getByRole('region', { name }))

  it('shows the card with owing and usage', () => {
    render(<App />)
    const visa = section('Shared Visa')
    expect(visa.getByLabelText('Limit')).toHaveValue('8000')
    expect(visa.getByLabelText('Available')).toHaveValue('5200')
    expect(visa.getByText('$2,800')).toBeInTheDocument()
    expect(visa.getByRole('meter', { name: 'Card used' })).toHaveAttribute('aria-valuenow', '35')
  })

  it('recalculates when the available amount changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const available = section('Shared Visa').getByLabelText('Available')
    await user.clear(available)
    await user.type(available, '1000')

    expect(section('Shared Visa').getByRole('meter', { name: 'Card used' })).toHaveAttribute('aria-valuenow', '88')
    expect(section('Shared Visa').getByText('Nearly maxed out')).toBeInTheDocument()
    // Owing 7,000 − personal 100 = shared 6,900
    expect(section('How the Visa splits').getByText('$6,900')).toBeInTheDocument()
    expect(stored().periods[1].available).toBe(1000)
  })

  it('explains the split', () => {
    render(<App />)
    const split = section('How the Visa splits')
    expect(split.getByText('$2,800')).toBeInTheDocument()
    expect(split.getByText('$2,700')).toBeInTheDocument()
    const list = within(split.getByRole('list'))
    expect(list.getAllByRole('listitem')[0]).toHaveTextContent('Charlie50% of shared $1,350 + personal $100$1,450')
    expect(list.getAllByRole('listitem')[1]).toHaveTextContent('Layla50% of shared $1,350$1,350')
  })

  it('has no savings goal', () => {
    render(<App />)
    expect(screen.queryByRole('region', { name: 'Savings goal' })).not.toBeInTheDocument()
  })

  it('adds a note and pins it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const notes = section('Notes')
    await user.type(notes.getByLabelText('Note'), 'Dentist on the 20th')
    await user.click(notes.getByRole('button', { name: 'Add note' }))

    const pin = section('Notes').getByRole('button', { name: 'Pin: Dentist on the 20th' })
    expect(pin).toHaveAttribute('aria-pressed', 'false')
    await user.click(pin)
    expect(pin).toHaveAttribute('aria-pressed', 'true')
    expect(stored().periods[1].notes[1]).toMatchObject({ text: 'Dentist on the 20th', pinned: true })
  })

  it('closes the month after confirming', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Close month' }))

    const dialog = within(screen.getByRole('dialog', { name: 'Close November 2026?' }))
    expect(dialog.getByText('This month finishes with $3,900 left over.')).toBeInTheDocument()
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Close month' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Month')).toHaveValue('2026-12')
    expect(hero()).toHaveTextContent('December 2026')
    expect(stored().periods[1].status).toBe('closed')
    expect(stored().periods[1]).not.toHaveProperty('savedToSavings')
    expect(stored()).not.toHaveProperty('savings')
    // Pinned note carried over; purchases cleared.
    expect(section('Notes').getByText('Car rego due in March')).toBeInTheDocument()
    expect(within(card('Charlie')).queryByRole('list')).not.toBeInTheDocument()
  })

  it('does nothing when cancelled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Close month' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored().currentPeriodId).toBe('2026-11')
  })

})

describe('past months', () => {
  beforeEach(() => {
    saveState(cloneExample())
  })

  const section = (name: string) => within(screen.getByRole('region', { name }))

  it('lists every month, newest first', () => {
    render(<App />)
    const options = within(screen.getByLabelText('Month')).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['November 2026', 'October 2026 (closed)'])
  })

  it('calculates a past month from its own snapshot', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Month'), '2026-10')

    expect(screen.getByText(/October 2026 is closed/)).toBeInTheDocument()
    expect(hero()).toHaveTextContent('$3,283')
    expect(within(card('Charlie')).getByLabelText('Salary')).toHaveValue('1900')
    expect(screen.queryByRole('button', { name: 'Close month' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add person' })).not.toBeInTheDocument()
  })

  it("edits a past month's snapshot without touching the live values", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Month'), '2026-10')

    const salary = within(card('Charlie')).getByLabelText('Salary')
    await user.clear(salary)
    await user.type(salary, '1950')
    const limit = section('Shared Visa').getByLabelText('Limit')
    await user.clear(limit)
    await user.type(limit, '9000')

    expect(stored().periods[0].snapshot.people[0].salary).toBe(1950)
    expect(stored().periods[0].snapshot.card.limit).toBe(9000)
    expect(stored().people[0].salary).toBe(2000)
    expect(stored().card.limit).toBe(8000)
    // October: limit 9,000 − available 4,800 = owing 4,200
    expect(section('Shared Visa').getByText('$4,200')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Month'), '2026-11')
    expect(section('Shared Visa').getByLabelText('Limit')).toHaveValue('8000')
    expect(within(card('Charlie')).getByLabelText('Salary')).toHaveValue('2000')
  })

  it('keeps the name read-only in a past month', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Month'), '2026-10')
    expect(within(card('Charlie')).queryByLabelText('Name')).not.toBeInTheDocument()
  })
})

describe('who made the change', () => {
  it('asks who is using the app and credits their changes', async () => {
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)

    const me = screen.getByLabelText("Who's using Our Money")
    expect(me).toHaveValue('')
    await user.selectOptions(me, 'p2')

    await user.type(within(screen.getByRole('region', { name: 'Notes' })).getByLabelText('Note'), 'Hi{Enter}')
    expect(stored().lastUpdated.by).toBe('p2')
    expect(screen.getByText(/Updated just now by Layla/)).toBeInTheDocument()

    // Editing Charlie's card is still Layla's change.
    await user.selectOptions(within(card('Charlie')).getByLabelText('Pay frequency'), 'weekly')
    expect(stored().lastUpdated.by).toBe('p2')
  })

  it("falls back to the card's owner when nobody is chosen", async () => {
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(within(card('Layla')).getByLabelText('Pay frequency'), 'weekly')
    expect(stored().lastUpdated.by).toBe('p2')
  })

  it('remembers the person who added themselves on first run', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Your name'), 'Charlie{Enter}')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    await user.type(screen.getByLabelText('Their name'), 'Layla{Enter}')

    expect(screen.getByLabelText("Who's using Our Money")).toHaveDisplayValue('Charlie')
    expect(stored().lastUpdated.by).toBe(stored().people[0].id)
  })
})

describe('last updated reminder', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  it('shows a gentle reminder after more than 7 days', () => {
    saveState({ ...cloneExample(), lastUpdated: { at: daysAgo(9), by: 'p1' } })
    render(<App />)
    expect(screen.getByText('It’s been 9 days since the last update.')).toBeInTheDocument()
    expect(screen.getByText(/Charlie made the last change/)).toBeInTheDocument()
  })

  it('stays quiet within 7 days', () => {
    saveState({ ...cloneExample(), lastUpdated: { at: daysAgo(6.9), by: 'p1' } })
    render(<App />)
    expect(screen.queryByText(/since the last update/)).not.toBeInTheDocument()
    expect(screen.getByText(/Updated .* by Charlie/)).toBeInTheDocument()
  })
})
