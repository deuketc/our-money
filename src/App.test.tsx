import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { saveState, STORAGE_KEY } from './store/storage'
import { cloneExample } from './test/exampleData'

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
const hero = () => screen.getByRole('region', { name: 'Balance' })
const card = (name: string) => screen.getByRole('article', { name })
const leftOver = (name: string) => within(card(name)).getByRole('region', { name: `${name} left over` })
/** One income or expense line on a person's card, found by its name. */
const line = (person: string, lineName: string) => within(within(card(person)).getByRole('group', { name: lineName }))
const purchases = (person: string) =>
  within(card(person)).queryByRole('list', { name: `${person}'s personal purchases` })

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

  it('splits each card into Income, Expenses, Visa and Left over, in that order', () => {
    render(<App />)
    const headings = within(card('Charlie'))
      .getAllByRole('heading', { level: 4 })
      .map((h) => h.textContent)
      .filter((text) => ['Income', 'Expenses', 'Visa', 'Left over'].includes(text ?? ''))
    expect(headings).toEqual(['Income', 'Expenses', 'Visa', 'Left over'])
  })

  it('shows monthly income, monthly expenses and the Visa totals', () => {
    render(<App />)
    const charlie = within(card('Charlie'))
    expect(charlie.getByText('Monthly income').closest('div')?.parentElement).toHaveTextContent('$4,333.33')
    expect(charlie.getByText('Monthly expenses').closest('div')?.parentElement).toHaveTextContent('$1,200')
    expect(charlie.getByText('Personal purchases').closest('div')?.parentElement).toHaveTextContent('$100')
    expect(line('Charlie', 'Salary').getByLabelText('Amount')).toHaveValue('2000')
    expect(line('Charlie', 'Salary').getByLabelText('Frequency')).toHaveValue('fortnightly')
    expect(line('Charlie', 'Salary').getByText('$4,333.33 a month')).toBeInTheDocument()
    expect(line('Charlie', 'Housing').getByLabelText('Amount')).toHaveValue('1200')
  })

  it('turns red when the money runs out', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.clear(line('Charlie', 'Salary').getByLabelText('Amount'))
    await user.clear(line('Layla', 'Salary').getByLabelText('Amount'))

    expect(hero()).toHaveTextContent("You're in the red")
    expect(hero()).toHaveTextContent('-$5,200')
    expect(stored().people[0].incomes[0].amount).toBe(0)
  })

  it('updates an income line’s frequency', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(line('Charlie', 'Salary').getByLabelText('Frequency'), 'monthly')

    expect(stored().people[0].incomes[0].frequency).toBe('monthly')
    // $2,000 monthly: 2000 − 1200 − 1450
    expect(leftOver('Charlie')).toHaveTextContent('-$650')
    expect(stored().lastUpdated.by).toBe('p1')
  })

  it('adds, names and removes an income line', async () => {
    const user = userEvent.setup()
    render(<App />)
    const charlie = within(card('Charlie'))
    // With only one line there's nothing to remove.
    expect(charlie.queryByRole('button', { name: 'Remove Salary' })).not.toBeInTheDocument()

    await user.click(charlie.getByRole('button', { name: 'Add income' }))
    expect(stored().people[0].incomes).toHaveLength(2)
    // The new line's name box takes focus, so you can type straight away.
    expect(line('Charlie', 'Income').getByLabelText('Income name')).toHaveFocus()
    await user.keyboard('Side job')
    await user.type(line('Charlie', 'Side job').getByLabelText('Amount'), '500')

    expect(stored().people[0].incomes[1]).toMatchObject({ name: 'Side job', amount: 500, frequency: 'monthly' })
    expect(charlie.getByText('Monthly income').closest('div')?.parentElement).toHaveTextContent('$4,833.33')
    expect(leftOver('Charlie')).toHaveTextContent('$2,183.33')

    await user.click(charlie.getByRole('button', { name: 'Remove Side job' }))
    expect(stored().people[0].incomes.map((l: { name: string }) => l.name)).toEqual(['Salary'])
    expect(leftOver('Charlie')).toHaveTextContent('$1,683.33')
  })

  it('adds an expense line', async () => {
    const user = userEvent.setup()
    render(<App />)
    const layla = within(card('Layla'))
    await user.click(layla.getByRole('button', { name: 'Add expense' }))
    await user.type(line('Layla', 'Expense').getByLabelText('Expense name'), 'Car insurance')
    await user.type(line('Layla', 'Car insurance').getByLabelText('Amount'), '600')
    await user.selectOptions(line('Layla', 'Car insurance').getByLabelText('Frequency'), 'yearly')

    expect(stored().people[1].expenses[1]).toMatchObject({ name: 'Car insurance', amount: 600, frequency: 'yearly' })
    expect(layla.getByText('Monthly expenses').closest('div')?.parentElement).toHaveTextContent('$1,250')
    expect(leftOver('Layla')).toHaveTextContent('$2,166.67')
    expect(stored().lastUpdated.by).toBe('p2')
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
    expect(purchases('Layla')).not.toBeInTheDocument()
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
    // New people start with one "Salary" income line and one "Housing" expense line.
    expect(stored().people[1].incomes).toEqual([expect.objectContaining({ name: 'Salary', amount: 0 })])
    expect(stored().people[1].expenses).toEqual([expect.objectContaining({ name: 'Housing', amount: 0 })])
    expect(line('Layla', 'Salary').getByLabelText('Amount')).toBeInTheDocument()
    expect(line('Layla', 'Housing').getByLabelText('Amount')).toBeInTheDocument()
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

  it('puts the Close month button in the balance card, with no separate section', () => {
    render(<App />)
    expect(within(hero()).getByRole('button', { name: 'Close month' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Close month' })).toHaveLength(1)
    expect(screen.queryByText(/save it to history and start fresh/)).not.toBeInTheDocument()
  })

  describe('on 15 Dec 2026', () => {
    // Only Date is faked, so userEvent's timers still run.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 11, 15, 10, 0))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('closes the period on today’s date after confirming, and starts the next one today', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(within(hero()).getByRole('button', { name: 'Close month' }))

      const dialog = within(screen.getByRole('dialog', { name: 'Close 5 Nov – 15 Dec 2026?' }))
      expect(dialog.getByText('Close 5 Nov – 15 Dec 2026 to save it to history and start fresh.')).toBeInTheDocument()
      expect(dialog.getByText('This period finishes with $3,900 left over.')).toBeInTheDocument()
      expect(dialog.getByText(/A new period starts today, 15 Dec – now/)).toBeInTheDocument()
      expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument()
      await user.click(dialog.getByRole('button', { name: 'Close month' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const next = stored().periods[2]
      expect(next).toMatchObject({ start: '2026-12-15', end: null, status: 'open' })
      expect(next.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(stored().currentPeriodId).toBe(next.id)
      expect(stored().periods[1]).toMatchObject({ status: 'closed', start: '2026-11-05', end: '2026-12-15' })

      expect(screen.getByLabelText('Period')).toHaveValue(next.id)
      const options = within(screen.getByLabelText('Period')).getAllByRole('option')
      expect(options.map((o) => o.textContent)).toEqual(['15 Dec – now', '5 Nov – 15 Dec 2026', '5 Oct – 5 Nov 2026'])
      expect(hero()).toHaveTextContent('15 Dec – now')
      // The new period is open, so its balance card offers Close month again.
      expect(within(hero()).getByRole('button', { name: 'Close month' })).toBeInTheDocument()
      // Pinned note carried over; purchases cleared.
      expect(section('Notes').getByText('Car rego due in March')).toBeInTheDocument()
      expect(purchases('Charlie')).not.toBeInTheDocument()
    })
  })

  it('does nothing when cancelled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Close month' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored().currentPeriodId).toBe('pd2')
  })

})

describe('past periods', () => {
  beforeEach(() => {
    saveState(cloneExample())
  })

  const section = (name: string) => within(screen.getByRole('region', { name }))

  it('lists every period by its dates, newest first', () => {
    render(<App />)
    const options = within(screen.getByLabelText('Period')).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['5 Nov – now', '5 Oct – 5 Nov 2026'])
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(['pd2', 'pd1'])
  })

  it('shows both years when a closed period crosses a year', () => {
    const data = cloneExample()
    data.periods[0].start = '2025-12-20'
    data.periods[0].end = '2026-01-15'
    saveState(data)
    render(<App />)
    const options = within(screen.getByLabelText('Period')).getAllByRole('option')
    expect(options[1]).toHaveTextContent('20 Dec 2025 – 15 Jan 2026')
  })

  it('calculates a past period from its own snapshot', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Period'), 'pd1')

    expect(screen.getByText(/5 Oct – 5 Nov 2026 is closed/)).toBeInTheDocument()
    expect(hero()).toHaveTextContent('5 Oct – 5 Nov 2026')
    expect(hero()).toHaveTextContent('$3,283')
    expect(line('Charlie', 'Salary').getByLabelText('Amount')).toHaveValue('1900')
    expect(screen.queryByRole('button', { name: 'Close month' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add person' })).not.toBeInTheDocument()
  })

  it("edits a past period's snapshot without touching the live values", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Period'), 'pd1')

    const salary = line('Charlie', 'Salary').getByLabelText('Amount')
    await user.clear(salary)
    await user.type(salary, '1950')
    const limit = section('Shared Visa').getByLabelText('Limit')
    await user.clear(limit)
    await user.type(limit, '9000')

    expect(stored().periods[0].snapshot.people[0].incomes[0].amount).toBe(1950)
    expect(stored().periods[0].snapshot.card.limit).toBe(9000)
    expect(stored().people[0].incomes[0].amount).toBe(2000)
    expect(stored().card.limit).toBe(8000)
    // October: limit 9,000 − available 4,800 = owing 4,200
    expect(section('Shared Visa').getByText('$4,200')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Period'), 'pd2')
    expect(section('Shared Visa').getByLabelText('Limit')).toHaveValue('8000')
    expect(line('Charlie', 'Salary').getByLabelText('Amount')).toHaveValue('2000')
  })

  it("adds a line to a past period's snapshot only", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Period'), 'pd1')
    await user.click(within(card('Layla')).getByRole('button', { name: 'Add expense' }))

    expect(stored().periods[0].snapshot.people[1].expenses).toHaveLength(2)
    expect(stored().people[1].expenses).toHaveLength(1)
  })

  it('keeps the name read-only in a past period', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Period'), 'pd1')
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
    await user.selectOptions(line('Charlie', 'Salary').getByLabelText('Frequency'), 'weekly')
    expect(stored().lastUpdated.by).toBe('p2')
  })

  it("falls back to the card's owner when nobody is chosen", async () => {
    saveState(cloneExample())
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(line('Layla', 'Salary').getByLabelText('Frequency'), 'weekly')
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

describe('wide-screen layout', () => {
  // jsdom ignores breakpoints, so this checks the structure the xl and 3xl
  // classes act on: the hero, the people area, and the Visa/split and notes
  // (which become separate columns at 3xl), all in one grid.
  const region = (name: string) => screen.getByRole('region', { name })

  it('puts the hero, people, Visa and notes in one grid with their column classes', () => {
    saveState(cloneExample())
    render(<App />)
    const peopleArea = card('Charlie').parentElement!
    expect(card('Layla').parentElement).toBe(peopleArea)
    expect(peopleArea).toHaveClass('xl:col-span-2', '3xl:col-[1/3]')

    const grid = peopleArea.parentElement!
    expect(grid).toHaveClass('xl:grid-cols-3', '3xl:grid-cols-4')

    const heroCell = hero().parentElement!
    expect(heroCell.parentElement).toBe(grid)
    expect(heroCell).toHaveClass('xl:col-span-full', '3xl:col-[4/5]', '3xl:row-[1/2]')

    const visaCell = region('Shared Visa').parentElement!
    expect(visaCell).toContainElement(region('How the Visa splits'))
    expect(visaCell).toHaveClass('3xl:col-[3/4]')

    const notesCell = region('Notes').parentElement!
    expect(notesCell).toHaveClass('3xl:col-[4/5]', '3xl:row-[2/3]')

    // Below 3xl the Visa/split and notes stack in one column; at 3xl it dissolves.
    const side = notesCell.parentElement!
    expect(side.parentElement).toBe(grid)
    expect(side).toContainElement(visaCell)
    expect(side).toHaveClass('3xl:contents')
  })

  it('keeps the hero above the people below xl (document order)', () => {
    saveState(cloneExample())
    render(<App />)
    expect(hero().compareDocumentPosition(card('Charlie')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(card('Layla').compareDocumentPosition(region('Shared Visa')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(region('How the Visa splits').compareDocumentPosition(region('Notes')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('uses two columns at xl and three at 3xl for one person', () => {
    const solo = cloneExample()
    solo.people = solo.people.filter((p) => p.id === 'p1')
    saveState(solo)
    render(<App />)
    expect(card('Charlie').parentElement!.parentElement).toHaveClass('xl:grid-cols-2', '3xl:grid-cols-3')
  })
})
