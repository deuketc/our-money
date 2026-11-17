# Our Money – Feature Plan

A simple, friendly budgeting app for couples, families or individuals who want one clear answer each month: **are we in the green?** It's based on Charlie and Layla's household spreadsheet.

## Core idea

- Built for everyday households, not businesses or power users.
- Income in, housing and card spending out, and a clear green or red balance at the end of the period.
- Works for one or more people. With a single user, everything just counts as theirs.

## Getting started and the monthly cycle

- **First run**: the app opens empty with a friendly prompt, "Add yourself to get started". Adding a person creates their named panel.
- **More people**: an "Add person" button creates a second panel. One person works fine too.
- **Saving**: autosaves to local storage on every change. A Save button writes everything to the JSON file.
- **Close month**: one button with a confirmation step. It saves the period to history and starts a fresh one.
- **Carries over**: people, salaries and pay frequency, housing, card limit and pinned notes.
- **Cleared**: the personal purchases list and unpinned notes.
- **On close**: the app offers to add the leftover balance to savings, and the amount can be edited.

## Person panel (one per person)

- **Salary**: entered with a pay frequency drop-down (weekly, fortnightly, monthly or yearly) and converted to a monthly figure. Fortnightly × 26 ÷ 12 (not × 2), so $2,000 a fortnight is about $4,333 a month. Weekly × 52 ÷ 12, yearly ÷ 12.
- **Housing**: their share of rent or mortgage (hint text: "rent or mortgage").
- **Shared Visa owing**: their share of the shared card spend (calculated).
- **Total Visa owing**: shared share plus their personal purchases (calculated).
- **Balance**: what's left over for the period (calculated, shown in green or red).

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

- Total salary, total housing, total Visa and total due on the Visa.
- Overall household balance.

## Last updated

- Stamped automatically whenever anything changes, showing who made the change.
- A gentle reminder if it's been about a week since the last update.

## Notes panel

- A list of dated note entries that either person can add, like "car rego due in March". Notes belong to each monthly period and are saved with it in the history. A "carry forward" (pin) option moves a note into the next period, so ongoing reminders stay visible.

## Period history

- The app opens on the current period.
- A drop-down lets you view or edit past periods.
- Closing a period saves it to history and starts a fresh one.
- Decided: periods are monthly, following the Visa statement dates. Pay frequency is handled by the salary conversion, not by the cycle.

## Savings goal (shared)

- Goals are shared, to keep it about "us" and avoid awkward comparisons.
- **Goal amount** and **current savings** are entered manually.
- When a period closes, the app offers to add the leftover balance to savings, and you can edit the amount.
- **Projection**: based on the average saved over recent periods, with an optional interest rate. For example, $2,000 a month is $24,000 a year before interest.
- Shows a message like "At this rate you'll hit your goal by March 2028."

## Data model

The file stores only what people type in. Balances and amounts owed are calculated every time and never saved.

```json
{
  "version": 1,
  "people": [
    {
      "id": "p1",
      "name": "Charlie",
      "salary": 2000,
      "payFrequency": "fortnightly",
      "housing": 1200
    },
    {
      "id": "p2",
      "name": "Layla",
      "salary": 2200,
      "payFrequency": "fortnightly",
      "housing": 1200
    }
  ],
  "card": { "limit": 8000, "splitDefault": 0.5 },
  "savings": {
    "goalName": "Holiday",
    "goalAmount": 10000,
    "current": 3500,
    "interestRate": 0.04
  },
  "currentPeriodId": "2026-11",
  "periods": [
    {
      "id": "2026-10",
      "start": "2026-10-05",
      "end": "2026-11-04",
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
      "savedToSavings": 800,
      "snapshot": {
        "people": [
          {
            "id": "p1",
            "name": "Charlie",
            "salary": 1900,
            "payFrequency": "fortnightly",
            "housing": 1200
          },
          {
            "id": "p2",
            "name": "Layla",
            "salary": 2200,
            "payFrequency": "fortnightly",
            "housing": 1200
          }
        ],
        "card": { "limit": 8000, "splitDefault": 0.5 }
      }
    },
    {
      "id": "2026-11",
      "start": "2026-11-05",
      "end": "2026-12-04",
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
      "savedToSavings": null,
      "snapshot": null
    }
  ],
  "lastUpdated": { "at": "2026-11-17T09:30:00+13:00", "by": "p1" }
}
```

In this example, October is closed. Its snapshot keeps Charlie's old $1,900 fortnightly salary, so October still calculates correctly after his pay rise to $2,000. November is open and uses the live values from the top level.

- **Top level** (carries over): people, card limit and default split, savings.
- **periods**: an array with one object per month, each holding that month's available amount, purchases and notes.
- **snapshot**: filled in when a month closes, so it keeps the salaries and housing as they were then. Editing a salary later doesn't change past months.
- **version**: lets the file format be upgraded later.

## Tech approach

- React web app hosted as a static site (Netlify or GitHub Pages). No backend and no accounts.
- Data stays on the device, in local storage plus a JSON file you can load and save.
- The File System Access API (Chrome/Edge) saves back to the same file. Other browsers fall back to downloading a copy.
- Export and import for backups.
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
- A big hero balance at the top that glows green or red.
- Clean cards for each person, the credit card, savings and notes.
- Icons from Lucide or Phosphor, like a house for Housing and a piggy bank for Savings.
- A chunky vector credit card showing the limit and available amounts on its face, with owing underneath and a usage bar that goes from green to orange to red.

&#91;embedded content: Main screen wireframe · example numbers\]

From top to bottom: header, hero balance, a card for each person (income, Visa with their personal purchases, left over), then the Visa card with how it splits, then savings and notes. Shaded boxes are editable; plain text is calculated. The numbers come from the example data model.

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
- Pure calculation functions (salary conversion, card split, balances, projections) don't need the DOM, so test them directly without Testing Library.
- Vitest workers run with `--no-experimental-webstorage` (set in `vite.config.ts`); without it, Node 22+'s built-in `localStorage` replaces jsdom's and storage tests fail.
- Test fixture: `src/test/exampleData.ts` is the example data model above. Use `cloneExample()` when a test changes it.

### Code layout

- `src/schema.ts`: Zod schema for the save file, and the source of all data types (`z.infer`). Objects are strict and cross-references are checked (current period exists and is open, closed periods have snapshots, purchases point to real people). Change the data shape here first.
- `src/calculations.ts`: pure derived values (monthly salary, Visa split, balances, savings projection). Nothing derived is ever stored.
- `src/store/reducer.ts`: pure reducer. Ids, timestamps and `by` arrive on the action (`meta`), so it never reads the clock. `closeMonth` builds the snapshot and opens the next period (starts the day after the old one ends; `available` resets to the card limit).
- `src/store/storage.ts`: local storage load/save. Data that fails validation is copied to `our-money:unreadable-backup` before the app starts fresh, so autosave can't destroy it.
- `src/store/useAppStore.ts`: `useReducer` plus autosave. `dispatch(action, by)` adds `meta`.
- Closed months stay editable: `updatePerson` and `updateCard` with a closed `periodId` edit that month's `snapshot`, never the live values. Names are only editable on the live person.
- `src/fileSave.ts`: Save/Open through the File System Access API, falling back to download/`<input type=file>`. The file handle is kept in IndexedDB so Save writes back to the same file after a reload. An opened file only becomes the save target once it passes validation.
- `src/saveFile.ts`: `parseSaveFile` turns JSON or Zod failures into friendly messages. `replaceState` loads a file and keeps its own `lastUpdated`.
- "Who's using Our Money" is a per-browser preference (`our-money:me` in localStorage, not in the save file). It sets `lastUpdated.by`; if nobody is chosen, edits on a person's card are credited to that person.
- TypeScript is strict about unused locals/parameters and uses `verbatimModuleSyntax`, so type-only imports need `import type`.
