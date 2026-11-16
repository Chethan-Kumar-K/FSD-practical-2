# CarbonFootprint India (React + TypeScript + GSAP)

Lab Exercises 5 & 6, Part 2. The Part 1 module (HTML, CSS, JavaScript) rebuilt in React with TypeScript, GSAP animations and full CRUD through an **Express API backed by SQLite**.

## Run it

```bash
npm install
npm start          # Express + SQLite API on :3001 and Vite on :5173 together
```

Or in two terminals: `npm run server` and `npm run dev`. Open http://localhost:5173.

- `npm run seed` replaces the entries in the SQLite database with 60 days of sample data ending today.
- `npm run test:api` runs the CRUD checks against an in-memory SQLite database.
- The database file is `data/carbon.db` (git-ignored). On the very first run the server imports the entries from `db.json` if that file exists, otherwise it adds sample data.
- `npm run build` type-checks and creates a production build in `dist/`.
- To point at another API, create `.env` with `VITE_API_URL=http://host:port`.

## Requirement checklist

| Requirement | Where |
|---|---|
| Functional components, JSX | every file in `src/components` |
| `useState()` | `EntryForm` (all fields), `App`, `EntryList`, `BarChart`, `useEntries` |
| Event handling | `onChange`, `onSubmit`, `onClick`, `onPointerEnter`, `onKeyDown` (Esc clears search) |
| Form handling, multiple inputs | `EntryForm`: controlled inputs with validation |
| Radio buttons | `RadioGroup` (category) |
| Select dropdown | activity `<select>` in `EntryForm` |
| Reusable components | `Button`, `FormField`, `RadioGroup`, `Reveal`, `AnimatedNumber` |
| CSS styling | `src/index.css` (tokens, dark mode, responsive grid) |
| Create / Read / Update / Delete | `src/api/entriesApi.ts` (POST, GET, PUT, DELETE) via `useEntries` |
| Bonus: search | `SearchBar` filters label, category and date live |
| Responsive design | mobile-first CSS, ready for Capacitor |

## Features ported from the original `3a` tracker

- **Trip measurement:** GPS distance tracking (HTTPS or localhost, permission required) and a simulated trip that fills the travel form without using location.
- **Reminders and alerts:** configurable daily reminders while the page is open, plus a notification or in-app alert when a newly logged activity crosses the daily budget.
- **Goals:** under-budget streak, weekly progress, and a 10% reduction goal.
- **Pledges:** save suggested changes, total their projected monthly/yearly savings, and drag suggestions into or pledges back out of the list.
- **Data portability:** download CSV and JSON backups, import/drag in a JSON backup (validated and merged without duplicate entries), share a summary, print a report, or clear all entries and pledges.
- **Log shortcuts:** repeat an entry, double-click or swipe a row to delete, then press Ctrl+Z (or Cmd+Z) to undo; Ctrl+Enter saves the form, Alt+1–4 changes category, `/` focuses the amount, and pasted text such as `12 km` supplies the number.
- **Insights:** donut and category breakdown, 14/30-day bar chart with an accessible table alternative, and calculations in a Web Worker where supported.
- **Navigation helpers:** reading progress, back-to-top button, session-restored form draft, receipt copy attribution, live document title, and online/offline notices.

Entries, pledges and the daily-reminder settings are all stored in SQLite (`data/carbon.db`) through the API, and the server recalculates kg from the catalogue on every write. Pledges and reminder settings that an earlier version kept in browser local storage are moved into the database the first time the page loads. Only the theme choice and the unsent form draft stay in the browser. JSON imports are capped at 2 MB / 5,000 entries and recalculate emissions from the current catalogue rather than trusting imported totals.

## GSAP

All plugin registration is in `src/lib/gsap.ts` and every animation uses the `useGSAP` hook (automatic cleanup).

- **Hero:** a [Scroll Craft](https://github.com/nateherkai/scroll-craft)-inspired timeline reveals the headline and receipt, then gives them different scroll-driven movement rates.
- **Header:** staggered slide-in.
- **Log rows:** staggered entrance, a highlight flash for a new record, slide-out on delete.
- **Numbers:** `AnimatedNumber` counts up on every change.
- **Insights:** bars and category fills grow in; recommendations slide in.
- **Sections:** `ScrollTrigger` reveals (`Reveal`).
- **Edit:** `ScrollToPlugin` glides up to the form.
- All animations are skipped when the system asks for reduced motion.

## Project layout

```
server/                 Express API (app.js), SQLite setup (db.js), catalogue, seed
data/carbon.db          SQLite database (created on first run, git-ignored)
db.json                 old JSON Server data, only imported once on first run
scripts/api-test.mjs    CRUD checks
src/
  api/entriesApi.ts     fetch wrappers (CRUD)
  hooks/useEntries.ts   state + server sync and batch import/clear
  hooks/useAnalysis.ts  worker-backed analysis with a main-thread fallback
  workers/              background analysis worker
  data/catalogue.ts     categories, emission factors, budget
  utils/                format helpers, analysis, validated backup parsing
  components/           Header, Hero, EntryForm, EntryList, EntryRow, SearchBar,
                        StatsPanel, ProgressPanel, BarChart, Recommendations,
                        TripTracker, DailyReminder, DataTools, ApiSupport,
                        ScrollProgress, Footer, Toast, ui/
  lib/gsap.ts           GSAP + plugin registration
```

## Screenshots to take for submission

1. **Create:** add an entry, screenshot the form and the new row (with the toast).
2. **Read:** the log list and the insights section.
3. **Update:** click Edit, change the amount, save, screenshot before and after.
4. **Delete:** delete a row and screenshot the list and toast.
5. **Bonus search:** type `car` in the search box and screenshot the filtered list.
6. `data/carbon.db` opened in a SQLite viewer (for example the VS Code SQLite extension) showing the change.

## Mobile later (Capacitor)

`npm i @capacitor/core @capacitor/cli`, `npx cap init`, `npm run build`, set `webDir` to `dist`, then `npx cap add android`. Point `VITE_API_URL` at a reachable API host first, since `localhost` on a phone is the phone.
