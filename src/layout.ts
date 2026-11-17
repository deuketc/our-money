// Responsive layout for the main screen. Everything below the header sits
// in one grid; these are the Tailwind classes that arrange it at xl and 3xl.
//
// Below xl the screen is stacked: hero balance, people (two to a row from
// md), the Visa card and its split (side by side from md), then notes.
//
// xl (1280px) and up: the hero stays full width, then
// - two or more people: three columns, one person per column, and a third
//   column stacking the Visa card, the split and notes;
// - one person: two columns, the person and that same stacked column.
//
// 3xl (1920px, a custom breakpoint in index.css) and up: the hero leaves the
// full-width row and everything sits in columns:
// - two or more people: four columns. 1 and 2 are the people, 3 stacks the
//   Visa card and the split, 4 stacks the hero balance with notes underneath;
// - one person: three columns, the person, the Visa and split, then the hero
//   and notes.
//
// A third person wraps onto a new row inside the people columns. The 3xl
// grid has rows `auto 1fr`: the hero sets the first row's height and notes
// start right under it, while the people and the Visa column span both rows.
//
// Class names are written out in full so Tailwind can find them.

export interface MainLayout {
  /** The grid holding everything below the header. */
  grid: string
  /** The hero balance. */
  hero: string
  /** The people area (itself a grid of person cards). */
  people: string
  /** The "Add person" card. */
  addPerson: string
  /** Wrapper for the Visa/split group and notes. Dissolves at 3xl so they can be placed separately. */
  side: string
  /** The Visa card and the split. */
  visa: string
  /** Notes. */
  notes: string
}

export function mainLayout(peopleCount: number): MainLayout {
  if (peopleCount <= 1) {
    return {
      grid: 'xl:grid-cols-2 3xl:grid-cols-3 3xl:grid-rows-[auto_1fr]',
      hero: 'xl:col-span-full 3xl:col-[3/4] 3xl:row-[1/2]',
      people: 'xl:grid-cols-1 3xl:col-[1/2] 3xl:row-[1/3]',
      addPerson: '',
      side: '3xl:contents',
      visa: '3xl:col-[2/3] 3xl:row-[1/3]',
      notes: '3xl:col-[3/4] 3xl:row-[2/3]',
    }
  }
  return {
    grid: 'xl:grid-cols-3 3xl:grid-cols-4 3xl:grid-rows-[auto_1fr]',
    hero: 'xl:col-span-full 3xl:col-[4/5] 3xl:row-[1/2]',
    people: 'xl:col-span-2 3xl:col-[1/3] 3xl:row-[1/3]',
    // With an even number of people the add card starts a new row: let it fill it.
    addPerson: peopleCount % 2 === 0 ? 'xl:col-span-2' : '',
    side: '3xl:contents',
    visa: '3xl:col-[3/4] 3xl:row-[1/3]',
    notes: '3xl:col-[4/5] 3xl:row-[2/3]',
  }
}
