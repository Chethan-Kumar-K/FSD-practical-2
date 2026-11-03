# CarbonFootprint India (React + TypeScript + GSAP)

Lab Exercises 5 & 6, Part 2. The Part 1 module (HTML, CSS, JavaScript) rebuilt in React with TypeScript, GSAP animations and full CRUD through **JSON Server**.

## Run it

```bash
npm install
npm start          # JSON Server on :3001 and Vite on :5173 together
```

Or in two terminals: `npm run server` and `npm run dev`. Open http://localhost:5173.

- `npm run seed` rewrites `db.json` with 60 days of sample entries ending today.
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

## GSAP

All plugin registration is in `src/lib/gsap.ts` and every animation uses the `useGSAP` hook (automatic cleanup).

- **Hero:** timeline with word-by-word headline reveal, then the receipt drops in.
- **Header:** staggered slide-in.
- **Log rows:** staggered entrance, a highlight flash for a new record, slide-out on delete.
- **Numbers:** `AnimatedNumber` counts up on every change.
- **Insights:** bars and category fills grow in; recommendations slide in.
- **Sections:** `ScrollTrigger` reveals (`Reveal`).
- **Edit:** `ScrollToPlugin` glides up to the form.
- All animations are skipped when the system asks for reduced motion.

## Project layout

```
db.json                 JSON Server database
scripts/seed.mjs        sample data generator
src/
  api/entriesApi.ts     fetch wrappers (CRUD)
  hooks/useEntries.ts   state + server sync
  data/catalogue.ts     categories, emission factors, budget
  utils/                format helpers, analysis (totals, recommendations)
  components/           Header, Hero, EntryForm, EntryList, EntryRow, SearchBar,
                        StatsPanel, BarChart, Recommendations, Footer, Toast, ui/
  lib/gsap.ts           GSAP + plugin registration
```

## Screenshots to take for submission

1. **Create:** add an entry, screenshot the form and the new row (with the toast).
2. **Read:** the log list and the insights section.
3. **Update:** click Edit, change the amount, save, screenshot before and after.
4. **Delete:** delete a row and screenshot the list and toast.
5. **Bonus search:** type `car` in the search box and screenshot the filtered list.
6. `db.json` open in the editor showing the change.

## Mobile later (Capacitor)

`npm i @capacitor/core @capacitor/cli`, `npx cap init`, `npm run build`, set `webDir` to `dist`, then `npx cap add android`. Point `VITE_API_URL` at a reachable API host first, since `localhost` on a phone is the phone.
