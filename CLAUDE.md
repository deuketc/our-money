# Our Money – Feature Plan

A simple, friendly budgeting app for couples, families or individuals who want one clear answer each month: **are we in the green?** It's based on Charlie and Layla's household spreadsheet.

## Core idea

- Built for everyday households, not businesses or power users.
- Income in, expenses (like housing) and card spending out, and a clear green or red balance at the end of the period.
- Works for one or more people. With a single user, everything just counts as theirs.

## Getting started and the period cycle

- **First run**: the app opens empty with a friendly prompt, "Add yourself to get started". Adding a person creates their named panel. The first period starts that day.
- **More people**: an "Add person" button creates a second panel. One person works fine too.
- **Saving**: autosaves to local storage on every change. On startup the app calls `navigator.storage.persist()` so the browser doesn't clear that data when space runs low.
- **Back up and Restore**: the file buttons are backup tools. "Back up" (download icon) writes everything to the JSON file; "Restore" (upload icon) loads a backup file.
  - Next to them: "Last backed up" with the date, or "Never". The date is kept in local storage for this browser, not in the save file.
  - A gentle reminder appears if the last backup was more than 14 days ago.
  - Restore asks for confirmation first and warns that it will overwrite everything there now, mentioning any changes made since the last backup. With nothing entered yet (the first-run screen) it restores straight away.
- **Periods are date ranges**, not calendar months. A period starts on the day it's created (first run, or the day the previous one closed) and ends on the day it's closed; the next period starts on that same day. Each has a unique id.
- **Labels**: closed periods show their range, like "15 Nov – 15 Dec 2026", with both years if it crosses a year ("20 Dec 2026 – 15 Jan 2027"). The open period shows "15 Dec – now". These labels are used in the period drop-down, the balance card, the closed-period banner and the Close month dialog.
- **Close month**: a small secondary button with a calendar-check icon in the bottom-right corner of the household balance card, shown only for the open period. There's no separate Close month section. It opens a confirmation dialog titled with the range the period will be saved as ("Close 5 Nov – 15 Dec 2026?"), explaining "Close 5 Nov – 15 Dec 2026 to save it to history and start fresh", how the period finishes, that a new period starts today, and what carries over or is cleared. Confirming ends the period today and starts a fresh one today.
- **Carries over**: people, their income and expense lines, card limit and pinned notes.
- **Cleared**: the personal purchases list and unpinned notes.

## Person panel (one per person)

Each card has four clearly separated sections, in this order, each with its own heading and icon and a dashed divider between them:

1. **Income** (wallet icon): a list of income lines, each with a name, amount and frequency (weekly, fortnightly, monthly or yearly). New people start with one "Salary" line. "Add income" adds a line; a line can be removed while there's more than one. Shows the **monthly income** total.
2. **Expenses** (receipt icon): the same pattern for non-Visa costs. New people start with one "Housing" line (their share of rent or mortgage). "Add expense" adds a line. Shows the **monthly expenses** total.
3. **Visa** (card icon): their share of the shared card spend, their personal purchases list with its total, and their **total Visa owing** (shared share plus personal purchases).
4. **Left over** (piggy bank icon): monthly income − monthly expenses − total Visa owing, shown in green or red.

- **Monthly conversion**: every line is converted to a monthly figure from its own frequency. Fortnightly × 26 ÷ 12 (not × 2), so $2,000 a fortnight is about $4,333 a month. Weekly × 52 ÷ 12, yearly ÷ 12. A line that isn't monthly shows its monthly figure under it.
- **New lines** start blank (the name box shows "Income" or "Expense" as a placeholder), at $0 monthly.

## Credit card

- **Limit** (for example $5,000 or $8,000): entered manually.
- **Available**: entered manually from the bank statement.
- **Owing**: calculated as limit minus available.
- **How it's split**: only personal purchases are logged. Shared spend = owing minus everyone's personal purchases, split 50/50 by default.
- **Uneven splits** (like 70/30): each person adds their portion to their own personal list. No extra feature needed.
- **Optional later**: a setting for different default split ratios.

## Personal purchases list

- Each row has a description, amount, date and who bought it.
- An "Add" button adds new rows.
- Every personal item is taken off the shared total and added to that person's Visa owing.
- Caveat: a personal purchase that isn't logged ends up split as shared. Reminders help with this.

## Couple summary (read-only)

- Total monthly income, total monthly expenses and total Visa owing (the balance card shows these as Income, Expenses and Visa).
- Overall household balance.

## Last updated

- Stamped automatically whenever anything changes, showing who made the change.
- A gentle reminder if it's been about a week since the last update.

## Notes panel

- A list of dated note entries that either person can add, like "car rego due in March". Notes belong to each period and are saved with it in the history. A "carry forward" (pin) option moves a note into the next period, so ongoing reminders stay visible.

## Period history

- The app opens on the current period.
- A drop-down lets you view or edit past periods.
- Closing a period saves it to history and starts a fresh one.
- Decided: periods are date ranges, from the day one opens to the day it's closed, so they can follow the Visa statement dates or any other rhythm. How often income and expenses are paid is handled by the monthly conversion, not by the cycle.
- The drop-down lists periods by their dates, newest first ("15 Dec – now", then "15 Nov – 15 Dec 2026" and so on).

## Data model

The file stores only what people type in. Balances and amounts owed are calculated every time and never saved.

```json
{
  "version": 3,
  "people": [
    {
      "id": "p1",
      "name": "Charlie",
      "incomes": [
        { "id": "i1", "name": "Salary", "amount": 2000, "frequency": "fortnightly" }
      ],
      "expenses": [
        { "id": "e1", "name": "Housing", "amount": 1200, "frequency": "monthly" }
      ]
    },
    {
      "id": "p2",
      "name": "Layla",
      "incomes": [
        { "id": "i2", "name": "Salary", "amount": 2200, "frequency": "fortnightly" }
      ],
      "expenses": [
        { "id": "e2", "name": "Housing", "amount": 1200, "frequency": "monthly" }
      ]
    }
  ],
  "card": { "limit": 8000, "splitDefault": 0.5 },
  "currentPeriodId": "pd2",
  "periods": [
    {
      "id": "pd1",
      "start": "2026-10-05",
      "end": "2026-11-05",
      "status": "closed",
      "available": 4800,
      "purchases": [
        {
          "id": "x0",
          "personId": "p2",
          "description": "New shoes",
          "amount": 140,
          "date": "2026-10-18"
        }
      ],
      "notes": [
        {
          "id": "n0",
          "text": "Car rego due in March",
          "date": "2026-10-20",
          "pinned": true
        }
      ],
      "snapshot": {
        "people": [
          {
            "id": "p1",
            "name": "Charlie",
            "incomes": [
              { "id": "i1", "name": "Salary", "amount": 1900, "frequency": "fortnightly" }
            ],
            "expenses": [
              { "id": "e1", "name": "Housing", "amount": 1200, "frequency": "monthly" }
            ]
          },
          {
            "id": "p2",
            "name": "Layla",
            "incomes": [
              { "id": "i2", "name": "Salary", "amount": 2200, "frequency": "fortnightly" }
            ],
            "expenses": [
              { "id": "e2", "name": "Housing", "amount": 1200, "frequency": "monthly" }
            ]
          }
        ],
        "card": { "limit": 8000, "splitDefault": 0.5 }
      }
    },
    {
      "id": "pd2",
      "start": "2026-11-05",
      "end": null,
      "status": "open",
      "available": 5200,
      "purchases": [
        {
          "id": "x1",
          "personId": "p1",
          "description": "PlayStation game",
          "amount": 100,
          "date": "2026-11-12"
        }
      ],
      "notes": [
        {
          "id": "n1",
          "text": "Car rego due in March",
          "date": "2026-11-10",
          "pinned": true
        }
      ],
      "snapshot": null
    }
  ],
  "lastUpdated": { "at": "2026-11-17T09:30:00+13:00", "by": "p1" }
}
```

In this example, the first period ("5 Oct – 5 Nov 2026") is closed. Its snapshot keeps Charlie's old $1,900 fortnightly salary, so it still calculates correctly after his pay rise to $2,000. The second period ("5 Nov – now") started the day the first one closed. It's open, so it has no end date yet, and it uses the live values from the top level.

- **Top level** (carries over): people, card limit and default split.
- **people**: each person has a name plus `incomes` and `expenses` arrays of lines. A line is `{ id, name, amount, frequency }`, where frequency is weekly, fortnightly, monthly or yearly. Line ids are unique within a person. A line's name can be blank while someone is typing.
- **periods**: an array with one object per period, in the order they were created, each holding that period's dates, available amount, purchases and notes.
  - **id**: a unique id (a random UUID for new periods; "pd1" and "pd2" above are just short examples).
  - **start**: the day the period was created. **end**: the day it was closed, or `null` while it's open. A closed period's `end` is the next period's `start`, and a period can close on the day it started.
- **snapshot**: filled in when a period closes, with copies of everyone's income and expense lines and the card as they were then. Editing a line later doesn't change past periods.
- **version**: the file format, currently 3. Only version 3 is accepted. Files from a newer version are refused with a friendly message, and older files are rejected as invalid (version 1 used calendar months; version 2 had a single salary, pay frequency and housing amount per person). There's no upgrade path, because no older data is kept anywhere.

## Tech approach

- React web app hosted as a static site (Netlify or GitHub Pages). No backend and no accounts.
- Data stays on the device, in local storage plus a JSON backup file you can back up to and restore from.
- The File System Access API (Chrome/Edge) saves back to the same file. Other browsers fall back to downloading a copy.
- Back up and Restore buttons for keeping a copy of the data.
- For now, both people use one shared PC. Later, saving the file in a shared iCloud or Google Drive folder would allow separate devices.
- Possible later: a desktop version with Electron or Tauri, or a PWA.

**Stack (decided):**

| Part                     | Choice                                 |
| ------------------------ | -------------------------------------- |
| Build tool and framework | Vite, React, TypeScript                |
| State                    | useReducer, autosaved to local storage |
| File validation          | Zod                                    |
| Styling and icons        | Tailwind CSS, Lucide                   |
| Tests                    | Vitest                                 |
| Hosting                  | Netlify or GitHub Pages                |

**Build order:** calculation functions with tests first, then the data model and saving, then the UI.

## Security

- JSON.parse never runs code, and React escapes text by default.
- Never use dangerouslySetInnerHTML or eval, or put loaded values straight into links or HTML.
- Check the file's structure when it loads, and reject files that are broken or tampered with.
- Use a strict Content Security Policy, keep dependencies to a minimum and protect the hosting account.

## Design

- Bright and friendly style.
- A big hero balance at the top that glows green or red, with the Close month button in its bottom-right corner.
- Clean cards for each person, the credit card and notes.
- Icons from Lucide or Phosphor, like a wallet for Income, a receipt for Expenses, a card for Visa and a piggy bank for Left over.
- A chunky vector credit card showing the limit and available amounts on its face, with owing underneath and a usage bar that goes from green to orange to red.

&#91;embedded content: Main screen wireframe · example numbers\]

From top to bottom: header, hero balance (with Close month in its corner), a card for each person (Income, Expenses, Visa with their personal purchases, then Left over), then the Visa card with how it splits, then notes. Shaded boxes are editable; plain text is calculated. The numbers come from the example data model.

### Responsive layout

- **Below `xl`**: the stacked layout above, at `max-w-5xl`. From `md`, person cards sit two to a row, and the Visa card and its split sit side by side.
- **`xl` (1280px) and up**: the header and hero balance stay full width, then a grid:
  - **Two or more people**: three columns, one person per column, with a third column stacking the Visa card, "How the Visa splits" and notes. A third person wraps onto a new row in the people columns.
  - **One person**: two columns, the person and that same stacked column.
- **`3xl` (1920px) and up**: `3xl` is a custom breakpoint (`--breakpoint-3xl: 120rem` in `src/index.css`). The header stays full width; the hero balance leaves the full-width row and everything sits in columns:
  - **Two or more people**: four columns. Columns 1 and 2 are the first and second person, column 3 stacks the Visa card and "How the Visa splits", and column 4 stacks the hero balance (same large size and green or red style) with notes underneath.
  - **One person**: three columns: the person, the Visa and split, then the hero and notes.
  - **How it works**: the grid rows are `auto 1fr`, so the hero sets the first row and notes start right under it, while the people and the Visa column span both rows. The wrapper that stacks the Visa/split and notes below `3xl` uses `3xl:contents` so they can be placed in separate columns.
- **Width cap**: content is centred and capped at `max-w-screen-2xl` (1536px) from `xl`, then `max-w-[140rem]` (2240px) from `3xl` so four columns aren't cramped (about 450px each at 1920px, 530px at the cap). The header and main share `pageWidthClass` so they line up.
- **DOM order**: the hero, people, Visa/split and notes are all in one grid, in that order, so the stacked layout below `xl` reads the same as before.
- **Inputs**: rows of form fields are capped at `max-w-xl` (`fieldRowClass`), so they stay a sensible width in wide columns, like the single-person layout.

## Later list (avoiding scope creep)

- Mortgage payoff tracking and projections.
- Custom split ratios.
- Syncing across separate devices.
- Settling up for shared costs paid outside the Visa (not needed for now).

## Development

```bash
npm run dev          # Vite dev server
npm run build        # type-check (tsc -b) then production build to dist/
npm run typecheck    # tsc -b only
npm run lint         # oxlint (config in .oxlintrc.json)
npm test             # Vitest, single run
npm run test:watch   # Vitest, watch mode
npx vitest run src/App.test.tsx      # one test file
npx vitest run -t "renders the app"  # tests matching a name
```

- Tailwind CSS v4 runs through the `@tailwindcss/vite` plugin. There is no `tailwind.config.js`; the CSS entry is `src/index.css` (`@import 'tailwindcss'`), and theme customisation goes there with `@theme`.
- Vitest config is in `vite.config.ts` (`test` block): jsdom environment, tests are `src/**/*.test.{ts,tsx}`, setup in `src/test/setup.ts` (jest-dom matchers, Testing Library cleanup). Import `describe`/`it`/`expect` from `vitest`; globals are off.
- Pure calculation functions (monthly conversion, card split, balances) don't need the DOM, so test them directly without Testing Library.
- Vitest workers run with `--no-experimental-webstorage` (set in `vite.config.ts`); without it, Node 22+'s built-in `localStorage` replaces jsdom's and storage tests fail.
- Test fixture: `src/test/exampleData.ts` is the example data model above. Use `cloneExample()` when a test changes it.

### Code layout

- `src/schema.ts`: Zod schema for the save file, and the source of all data types (`z.infer`). Objects are strict and cross-references are checked (current period exists and is open, unique period ids, closed periods have an end date and a snapshot, open ones have neither, no period ends before it starts, purchases point to real people, line ids are unique within each person, live and in snapshots). Change the data shape here first. `CURRENT_VERSION` is 3 and is the only version accepted. If the format changes again and existing data must survive, add an upgrade step (a `z.preprocess` before the strict schema) rather than loosening the strict objects.
- `src/calculations.ts`: pure derived values (`monthlyTotal` of income or expense lines, Visa split, balances, stale-update check) and `periodsNewestFirst` (by start date; ties go to the later period in the array). Nothing derived is ever stored.
- `src/format.ts`: display formatting, including `formatPeriodRange` for the period labels ("15 Nov – 15 Dec 2026", "15 Dec – now").
- `src/store/reducer.ts`: pure reducer. Ids, timestamps, `by` and dates arrive on the action, so it never reads the clock. `closeMonth { date, nextPeriodId }` ends the open period on `date` (a date before its start counts as the start), snapshots people and card, and opens `nextPeriodId` starting that same day with no end date; `available` resets to the card limit. `createInitialState(today, periodId)` starts the first period on `today`. `createPerson(ids, name)` builds a new person with a "Salary" income line and a "Housing" expense line. `addLine`, `updateLine` and `removeLine` take `personId`, `list` (`'incomes'` or `'expenses'`) and an optional `periodId`.
- `src/store/storage.ts`: local storage load/save. Data that fails validation is copied to `our-money:unreadable-backup` before the app starts fresh, so autosave can't destroy it.
- `src/store/useAppStore.ts`: `useReducer` plus autosave. `dispatch(action, by)` adds `meta`.
- Closed periods stay editable: the line actions and `updateCard` with a closed `periodId` edit that period's `snapshot`, never the live values. Names are only editable on the live person.
- `src/components/PersonCard.tsx` and `LineList.tsx`: the four card sections. `LineList` renders income or expense lines as groups labelled by the line's name, with "Income name"/"Expense name", "Amount" and "Frequency" fields; the remove button only shows while there's more than one line.
- `src/layout.ts`: `mainLayout(peopleCount)` picks the `xl:` and `3xl:` grid and placement classes for the main screen (see Responsive layout). Class names are written out in full so Tailwind finds them; jsdom ignores breakpoints, so tests check the classes and structure, not the rendered columns.
- `src/components/styles.ts`: shared class names, including `pageWidthClass` and `fieldRowClass`.
- `src/fileSave.ts`: the file side of Back up/Restore, through the File System Access API, falling back to download/`<input type=file>`. The file handle is kept in IndexedDB so Back up writes to the same file after a reload. A restored file only becomes the backup target once it passes validation.
- `src/saveFile.ts`: `parseSaveFile` turns JSON or Zod failures into friendly messages. `replaceState` loads a file and keeps its own `lastUpdated`.
- "Who's using Our Money" is a per-browser preference (`our-money:me` in localStorage, not in the save file). It sets `lastUpdated.by`; if nobody is chosen, edits on a person's card are credited to that person.
- `src/lastBackup.ts`: "Last backed up" is also per-browser (`our-money:last-backup`, an ISO timestamp). It's set only after a successful backup (saved or downloaded), never by Restore; an unreadable value counts as "Never". `isBackupDue` in `calculations.ts` drives the 14-day reminder.
- `src/persistStorage.ts`: `requestPersistentStorage()`, called from `main.tsx` on startup. It skips the request if storage is already persistent and never throws.
- TypeScript is strict about unused locals/parameters and uses `verbatimModuleSyntax`, so type-only imports need `import type`.
