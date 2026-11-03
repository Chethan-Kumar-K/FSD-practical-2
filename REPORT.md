# Lab Exercise 5 & 6: Domain-Based React Application

**Domain:** Carbon Footprint Tracker & Reduction Recommender (CarbonFootprint India)
**Stack:** React, TypeScript, Vite, GSAP, JSON Server

## 1. Overview

In Part 1 the CarbonFootprint India module was built with HTML, Tailwind CSS and JavaScript. It lets a person log daily activities (travel, home energy, food, shopping), converts them to kg CO₂e with illustrative emission factors, and compares the day against a 6.3 kg budget. Part 2 rebuilds the same module in React with TypeScript, adds persistent CRUD operations through JSON Server, and animates the interface with GSAP. The categories, emission factors, budget and recommendation rules are carried over unchanged.

## 2. Architecture

The page is split into small, typed components. `App` owns the shared state (search text, the entry being edited, theme, toast) and passes data and callbacks down. The `useEntries` hook is the only place that talks to the server, through `entriesApi.ts`. Reusable pieces (`Button`, `FormField`, `RadioGroup`, `AnimatedNumber`, `Reveal`) are used across sections. Calculations live in plain functions (`analysis.ts`, `catalogue.ts`), so they are independent of the UI. Compared with Part 1, the DOM-building helpers and global variables are replaced by declarative JSX and component state, which makes the code shorter and easier to maintain.

## 3. React concepts used

- **Functional components and JSX** for all UI.
- **useState** for controlled form fields, search text, editing target, chart range and the theme.
- **Event handling** with `onChange`, `onSubmit`, `onClick`, pointer and keyboard events.
- **Form handling** with multiple inputs: a radio group for the category, a select for the activity, a number input with a dynamic unit, and a date input. Validation messages appear per field, and a live estimate updates as the person types.
- **Dynamic rendering** of the log, receipt, charts and recommendations from state.

## 4. CRUD with JSON Server

Records are stored in `db.json` and accessed over REST at `/entries`:

| Operation | Request | UI |
|---|---|---|
| Create | `POST /entries` | "Add to my log" |
| Read | `GET /entries` | log list, receipt, charts |
| Update | `PUT /entries/:id` | "Edit" fills the form, "Save changes" |
| Delete | `DELETE /entries/:id` | "Delete" on a row |

The bonus search box filters the list live by activity, category or date. If the server is not running, the log shows a clear error with a retry button.

## 5. GSAP animation

A hero timeline reveals the headline word by word and drops in the receipt. Log rows stagger in, a new record flashes, and a deleted row slides out before it is removed. Totals count up, chart bars and category fills grow, and sections reveal on scroll with ScrollTrigger. Editing scrolls smoothly to the form with ScrollToPlugin. Animations are cleaned up with the `useGSAP` hook and skipped when the system requests reduced motion.

## 6. Responsive design

The layout is mobile-first with CSS grid and a collapsible navigation. It works from phone to desktop and can be wrapped as an Android or iOS app with Capacitor with no change to the React code beyond pointing the API URL at a reachable host.

## 7. Outcome

The React version keeps every calculation of Part 1 while adding persistent storage, in-place editing, search and animation, with clearer separation between data, logic and presentation.
