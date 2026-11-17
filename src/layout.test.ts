import { describe, expect, it } from 'vitest'
import { pageWidthClass } from './components/styles'
import { mainLayout } from './layout'

// jsdom doesn't apply media queries, so these check which Tailwind classes
// are chosen. The layout itself was checked in a real browser.

const classesOf = (count: number) => Object.values(mainLayout(count)).join(' ').split(' ').filter(Boolean)

describe('mainLayout at xl', () => {
  it('uses two columns for one person', () => {
    const layout = mainLayout(1)
    expect(layout.grid).toContain('xl:grid-cols-2')
    expect(layout.people).toContain('xl:grid-cols-1')
  })

  it('uses three columns for two people, one person per column', () => {
    const layout = mainLayout(2)
    expect(layout.grid).toContain('xl:grid-cols-3')
    expect(layout.people).toContain('xl:col-span-2')
    expect(layout.addPerson).toBe('xl:col-span-2')
  })

  it('keeps the hero full width', () => {
    expect(mainLayout(1).hero).toContain('xl:col-span-full')
    expect(mainLayout(2).hero).toContain('xl:col-span-full')
  })

  it('wraps a third person into the people columns', () => {
    expect(mainLayout(3).people).toContain('xl:col-span-2')
    expect(mainLayout(3).addPerson).toBe('')
  })
})

describe('mainLayout at 3xl', () => {
  it('uses four columns for two people: people, people, Visa and split, hero and notes', () => {
    const layout = mainLayout(2)
    expect(layout.grid).toContain('3xl:grid-cols-4')
    expect(layout.people).toContain('3xl:col-[1/3]')
    expect(layout.visa).toContain('3xl:col-[3/4]')
    expect(layout.hero).toContain('3xl:col-[4/5] 3xl:row-[1/2]')
    expect(layout.notes).toContain('3xl:col-[4/5] 3xl:row-[2/3]')
  })

  it('uses three columns for one person', () => {
    const layout = mainLayout(1)
    expect(layout.grid).toContain('3xl:grid-cols-3')
    expect(layout.people).toContain('3xl:col-[1/2]')
    expect(layout.visa).toContain('3xl:col-[2/3]')
    expect(layout.hero).toContain('3xl:col-[3/4] 3xl:row-[1/2]')
    expect(layout.notes).toContain('3xl:col-[3/4] 3xl:row-[2/3]')
  })

  it('lets the hero set the first row so notes sit right under it', () => {
    for (const count of [1, 2]) {
      expect(mainLayout(count).grid).toContain('3xl:grid-rows-[auto_1fr]')
      expect(mainLayout(count).side).toBe('3xl:contents')
    }
  })
})

describe('mainLayout', () => {
  it('only changes things from xl up', () => {
    for (const count of [0, 1, 2, 3, 4]) {
      expect(classesOf(count).every((c) => c.startsWith('xl:') || c.startsWith('3xl:'))).toBe(true)
    }
  })
})

describe('page width', () => {
  it('keeps the original width below xl, caps at 2xl, then widens at 3xl', () => {
    expect(pageWidthClass).toBe('max-w-5xl xl:max-w-screen-2xl 3xl:max-w-[140rem]')
  })
})
