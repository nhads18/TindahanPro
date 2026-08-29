# TindahanPro Store OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the SukiBook Sari-Sari Store Manager into a new, rebranded TindahanPro project, deploy it to Vercel in demo mode, then add four capability modules (Cash Flow, Services, Barcode/Receipts, Staff/Loyalty).

**Architecture:** Offline-first React SPA. A single React context (`store.tsx`) holds a root `DB` object; every mutation writes localStorage synchronously, with an optional debounced Supabase push in live mode. The app runs fully in demo mode with no env vars, so it deploys to Vercel immediately.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind CSS v4, framer-motion, recharts, lucide-react, @dnd-kit, date-fns, canvas-confetti, uuid, @supabase/supabase-js. Tests: Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-tindahanpro-store-os-design.md`

## Global Constraints

- **Node:** 18+ required.
- **Package manager:** npm (a `package-lock.json` is committed).
- **Brand:** All user-facing copy says "TindahanPro" — never "SukiBook". App title, README, footer, receipt header.
- **Table prefix:** All Supabase tables and their references use `tp_` — never `sb_`. This includes SQL, `supabase.ts` table names, and any table-name string literals.
- **localStorage key:** Use `tindahanpro.db` (not SukiBook's key) so demo data does not collide with a SukiBook install on the same origin.
- **Money/qty inputs:** non-negative; sale voids are soft (`voided_at`), never hard deletes.
- **Quality gate (run before every deploy and at the end of every task):** `npm run typecheck` (`tsc --noEmit`) AND `npm run build` (`vite build`) must both pass.
- **Source of truth for porting:** SukiBook files are fetched from `https://raw.githubusercontent.com/nhads18/SukiBook/main/<path>`. Port faithfully, then apply the rebrand + prefix rules above.
- **Commits:** frequent, one per task minimum; end messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Phase 1 — Foundation: scaffold, port, rebrand, deploy demo

### Task 1: Project scaffold & config

**Files:**
- Create: `package.json`, `vite.config.js`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`, `src/vite-env.d.ts`, `src/index.css`, `src/main.tsx` (temporary placeholder)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a runnable Vite skeleton; scripts `dev`, `build`, `typecheck`, `test`.

- [ ] **Step 1: Create `package.json`** mirroring SukiBook's deps, renamed, with Vitest added:

```json
{
  "name": "tindahanpro",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@supabase/supabase-js": "^2.98.0",
    "canvas-confetti": "^1.9.3",
    "date-fns": "^2.30.0",
    "framer-motion": "^11.16.1",
    "lucide-react": "^0.294.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "recharts": "^2.10.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.7",
    "@types/canvas-confetti": "^1.6.4",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.7",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.1.7",
    "typescript": "^5.7.0",
    "vite": "^6.3.5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`** with React + Tailwind v4 plugins and a Vitest `test` block:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 3: Create `tsconfig.json`** (fetch SukiBook's from raw URL as the base; keep it verbatim unless a compile error requires a change).

- [ ] **Step 4: Create `index.html`** with `<title>TindahanPro — Sari-Sari Store OS</title>` and a `<div id="root">`, and `<script type="module" src="/src/main.tsx">`.

- [ ] **Step 5: Create `.gitignore`** (`node_modules`, `dist`, `.env`, `.env.local`, `.vercel`), `.env.example` with `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=`, `src/vite-env.d.ts` (`/// <reference types="vite/client" />`), `src/index.css` (`@import "tailwindcss";`), and a temporary `src/main.tsx` that renders `<h1>TindahanPro</h1>`.

- [ ] **Step 6: Install & verify build**

Run: `npm install && npm run build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold TindahanPro Vite project"
```

---

### Task 2: Port the data/state/lib layer

**Files:**
- Create: `src/lib/data.ts`, `src/lib/store.tsx`, `src/lib/supabase.ts`, `src/lib/i18n.ts`

**Interfaces:**
- Consumes: Task 1 skeleton.
- Produces: `DB` type and all core types (`Product`, `Customer`, `Sale`, `SaleItem`, `Movement`, `HistEntry`), the store context/hook (e.g. `useStore()`), selector functions, and the Supabase client with a demo-mode guard. Later tasks import types and `useStore` from here.

- [ ] **Step 1: Fetch and port each lib file** from `https://raw.githubusercontent.com/nhads18/SukiBook/main/src/lib/<file>` (`data.ts`, `store.tsx`, `supabase.ts`, `i18n.ts`). Copy faithfully into `src/lib/`.

- [ ] **Step 2: Apply rebrand + prefix rules** across the four files:
  - Table name literals `sb_*` → `tp_*` (in `supabase.ts` / wherever tables are referenced).
  - localStorage key → `tindahanpro.db`.
  - Any "SukiBook" string → "TindahanPro".
  - Leave the demo-mode guard intact: if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are absent, the client is null/demo and no network calls are made.

- [ ] **Step 3: Extend the model for later modules** — add these fields now so ports and modules line up (see spec §5):
  - `Product`: add `barcode?: string`.
  - `Customer`: add `points?: number`.
  - Add new types (empty arrays default in `DB`): `Service` (`id, ts, kind:'eload'|'bills'|'gcash_in'|'gcash_out', provider?, amount, commission, payment:'cash'|'gcash', note?`), `Expense` (`id, ts, category, amount, note?`), `Purchase` (`id, ts, supplier, total, items: {product_id,name,qty,unit_cost}[]`).
  - `DB`: add `services: Service[]`, `expenses: Expense[]`, `purchases: Purchase[]` (default `[]`), and extend the settings shape with `loyalty`, `staff`, `receipt` (optional, see spec §5). Ensure any DB-migration/normalization function fills missing arrays with `[]` so old localStorage loads don't crash.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (fix import paths / missing types until green).

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: port and rebrand data/state/lib layer with OS model extensions"
```

---

### Task 3: Port shared components

**Files:**
- Create: `src/components/ui.tsx`, `src/components/Icons.tsx`, `src/components/charts.tsx`, `src/components/LoginGate.tsx`

**Interfaces:**
- Consumes: `src/lib/*` from Task 2.
- Produces: shared UI primitives, icon set, chart wrappers, and the magic-link login gate used by the app shell.

- [ ] **Step 1: Fetch and port** each from `https://raw.githubusercontent.com/nhads18/SukiBook/main/src/components/<file>` into `src/components/`.

- [ ] **Step 2: Apply rebrand** (any "SukiBook" copy → "TindahanPro").

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat: port shared components"
```

---

### Task 4: Port views and app shell

**Files:**
- Create: `src/views/Dashboard.tsx`, `Sales.tsx`, `Products.tsx`, `Stock.tsx`, `Utang.tsx`, `Reports.tsx`, `Settings.tsx` (skip SukiBook's `Deploy.tsx` — replaced by our own runbook), `src/App.tsx`, `src/Mobile.tsx`, and overwrite `src/main.tsx`.

**Interfaces:**
- Consumes: `src/lib/*`, `src/components/*`.
- Produces: the full working demo app (existing SukiBook feature set) mounted from `main.tsx`.

- [ ] **Step 1: Fetch and port** the seven views + `App.tsx`, `Mobile.tsx`, `main.tsx` from raw URLs. Do **not** port `views/Deploy.tsx`; remove any route/menu entry that points to it.

- [ ] **Step 2: Apply rebrand** across all (title, nav label, footer → "TindahanPro"). Confirm `main.tsx` renders the real `App`, replacing the Task 1 placeholder.

- [ ] **Step 3: Verify gate**

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 4: Smoke test in demo mode**

Run: `npm run dev`, open the local URL. Verify: dashboard loads with seeded demo data, a sale can be rung up in POS, products list renders, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: port views and app shell (demo app working)"
```

---

### Task 5: Branding, README, Vercel config

**Files:**
- Create: `README.md`, `vercel.json`, `public/` assets if needed (favicon/manifest)
- Modify: `index.html` (meta/theme), `src/index.css` (accent theme if desired)

**Interfaces:**
- Consumes: working app from Task 4.
- Produces: a repo ready to import into Vercel as an SPA.

- [ ] **Step 1: Write `vercel.json`** for SPA routing and Vite output:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Write `README.md`** — TindahanPro overview, demo-vs-live mode, local dev (`npm install`, `npm run dev`), and a link to `DEPLOYMENT.md`.

- [ ] **Step 3: Verify gate**

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: branding, README, Vercel SPA config"
```

---

### Task 6: Deploy demo build to Vercel

**Files:** none (deployment task).

**Interfaces:**
- Consumes: the built, committed repo.
- Produces: a live demo-mode URL.

- [ ] **Step 1: Push to GitHub.** Create/confirm the `TindahanPro` GitHub repo (user action for account/remote), then `git push -u origin main`.

- [ ] **Step 2: Deploy to Vercel** — import the repo in Vercel with **no env vars** (demo mode). If a connected Vercel deploy tool is available and the user directs it, trigger the deploy through that; otherwise the user clicks Import → Deploy. Framework preset: Vite; build `npm run build`; output `dist`.

- [ ] **Step 3: Verify the live URL** loads the dashboard in demo mode with no console errors.

- [ ] **Step 4: Record the URL** in `README.md` (Live demo: …) and commit.

**➡️ Milestone: early live demo URL reached (build order steps 1–2 complete).**

---

## Phase 2 — Cash Flow module (expenses + supplier purchases)

### Task 7: Cash-flow selectors (TDD)

**Files:**
- Create: `src/lib/cashflow.ts`, `src/lib/cashflow.test.ts`

**Interfaces:**
- Consumes: `Expense`, `Purchase`, `Sale`, `Service`, `DB` from `src/lib/data.ts`.
- Produces: `netCashFlow(db, range?): { revenue, serviceCommission, expenses, purchaseCost, net }` and `expensesByCategory(db, range?): Record<string, number>`.

- [ ] **Step 1: Write the failing test** `src/lib/cashflow.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { netCashFlow } from './cashflow'

const base = { products: [], customers: [], sales: [], movements: [],
  services: [], expenses: [], purchases: [] } as any

describe('netCashFlow', () => {
  it('nets revenue and commission against expenses and purchase cost', () => {
    const db = { ...base,
      sales: [{ id: 's1', ts: 1, payment: 'cash', total: 1000, items: [] }],
      services: [{ id: 'e1', ts: 1, kind: 'eload', amount: 300, commission: 20, payment: 'cash' }],
      expenses: [{ id: 'x1', ts: 1, category: 'rent', amount: 500 }],
      purchases: [{ id: 'p1', ts: 1, supplier: 'A', total: 200, items: [] }],
    }
    const r = netCashFlow(db)
    expect(r.revenue).toBe(1000)
    expect(r.serviceCommission).toBe(20)
    expect(r.expenses).toBe(500)
    expect(r.purchaseCost).toBe(200)
    expect(r.net).toBe(320) // 1000 + 20 - 500 - 200
  })
  it('excludes voided sales from revenue', () => {
    const db = { ...base, sales: [{ id: 's1', ts: 1, payment: 'cash', total: 1000, items: [], voided_at: 5 }] }
    expect(netCashFlow(db).revenue).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cashflow.test.ts`
Expected: FAIL ("netCashFlow is not a function" / module not found).

- [ ] **Step 3: Implement `src/lib/cashflow.ts`**

```ts
import type { DB } from './data'

export interface CashFlow {
  revenue: number; serviceCommission: number
  expenses: number; purchaseCost: number; net: number
}

export function netCashFlow(db: DB): CashFlow {
  const revenue = db.sales.filter(s => !s.voided_at)
    .reduce((n, s) => n + s.total, 0)
  const serviceCommission = db.services.reduce((n, s) => n + (s.commission || 0), 0)
  const expenses = db.expenses.reduce((n, e) => n + e.amount, 0)
  const purchaseCost = db.purchases.reduce((n, p) => n + p.total, 0)
  return { revenue, serviceCommission, expenses, purchaseCost,
    net: revenue + serviceCommission - expenses - purchaseCost }
}

export function expensesByCategory(db: DB): Record<string, number> {
  return db.expenses.reduce((m, e) => {
    m[e.category] = (m[e.category] || 0) + e.amount; return m
  }, {} as Record<string, number>)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/cashflow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cashflow.ts src/lib/cashflow.test.ts
git commit -m "feat: cash-flow selectors with tests"
```

---

### Task 8: CashFlow view + store actions

**Files:**
- Create: `src/views/CashFlow.tsx`
- Modify: `src/lib/store.tsx` (add `addExpense`, `addPurchase` actions), `src/App.tsx` + `src/Mobile.tsx` (route + nav entry)

**Interfaces:**
- Consumes: `netCashFlow`, `expensesByCategory` (Task 7); `useStore`.
- Produces: a Cash Flow view with Expenses and Purchases tabs. `addPurchase` increments product stock and appends a `restock` movement per line item.

- [ ] **Step 1: Add store actions** in `store.tsx`:
  - `addExpense(e: Omit<Expense,'id'|'ts'>)` → prepend to `db.expenses` with `uuid()` + `Date.now()`.
  - `addPurchase(p: Omit<Purchase,'id'|'ts'>)` → append to `db.purchases`; for each line item, increment matching product `stock` by `qty` and push a `movement` `{type:'restock', qty, product_id, name, ts}`.

- [ ] **Step 2: Build `CashFlow.tsx`** — two tabs. Expenses: form (category select, amount, note) + list + category totals from `expensesByCategory`. Purchases: form (supplier, add line items picking product + qty + unit cost) + list. Show the `netCashFlow` summary card at top.

- [ ] **Step 3: Wire route + nav** in `App.tsx`/`Mobile.tsx` (add "Cash Flow" entry with a lucide icon).

- [ ] **Step 4: Verify gate + smoke test**

Run: `npm run typecheck && npm run build`, then `npm run dev` — add an expense and a purchase; confirm stock increases and net updates.
Expected: gate PASS, behaviors correct.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Cash Flow view (expenses + supplier purchases)"
```

---

## Phase 3 — Services module (e-load / bills / GCash)

### Task 9: Service selectors (TDD)

**Files:**
- Create: `src/lib/services.ts`, `src/lib/services.test.ts`

**Interfaces:**
- Consumes: `Service`, `DB`.
- Produces: `serviceTotals(db): Record<Service['kind'], { count, amount, commission }>` and `serviceCommissionTotal(db): number`.

- [ ] **Step 1: Write the failing test** covering: two e-loads and one gcash_in aggregate to correct per-kind count/amount/commission, and `serviceCommissionTotal` sums all commissions.

```ts
import { describe, it, expect } from 'vitest'
import { serviceTotals, serviceCommissionTotal } from './services'

const db = { services: [
  { id:'1', ts:1, kind:'eload', amount:100, commission:5, payment:'cash' },
  { id:'2', ts:2, kind:'eload', amount:50,  commission:3, payment:'cash' },
  { id:'3', ts:3, kind:'gcash_in', amount:500, commission:10, payment:'gcash' },
]} as any

describe('serviceTotals', () => {
  it('aggregates per kind', () => {
    const t = serviceTotals(db)
    expect(t.eload).toEqual({ count: 2, amount: 150, commission: 8 })
    expect(t.gcash_in.commission).toBe(10)
  })
  it('sums all commission', () => {
    expect(serviceCommissionTotal(db)).toBe(18)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/services.ts`**

```ts
import type { DB, Service } from './data'
type Agg = { count: number; amount: number; commission: number }

export function serviceTotals(db: DB): Record<Service['kind'], Agg> {
  const out = {} as Record<Service['kind'], Agg>
  for (const s of db.services) {
    const a = out[s.kind] || (out[s.kind] = { count: 0, amount: 0, commission: 0 })
    a.count++; a.amount += s.amount; a.commission += s.commission || 0
  }
  return out
}

export function serviceCommissionTotal(db: DB): number {
  return db.services.reduce((n, s) => n + (s.commission || 0), 0)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/services.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services.ts src/lib/services.test.ts
git commit -m "feat: service selectors with tests"
```

---

### Task 10: Services view + store action

**Files:**
- Create: `src/views/Services.tsx`
- Modify: `src/lib/store.tsx` (`addService`), `src/App.tsx` + `src/Mobile.tsx`, and Dashboard/Reports to include `serviceCommissionTotal` in revenue.

**Interfaces:**
- Consumes: `serviceTotals`, `serviceCommissionTotal`, `useStore`.
- Produces: quick-entry Services view; commission included in dashboard revenue.

- [ ] **Step 1: Add `addService(s: Omit<Service,'id'|'ts'>)`** in `store.tsx` (prepend with id + ts).

- [ ] **Step 2: Build `Services.tsx`** — four quick-entry cards (E-load, Bills, GCash In, GCash Out): amount + commission + payment; below, today's per-kind totals from `serviceTotals`.

- [ ] **Step 3: Wire route + nav**, and add `serviceCommissionTotal(db)` into the Dashboard revenue/profit figure and Reports (import from `src/lib/services.ts`).

- [ ] **Step 4: Verify gate + smoke test**

Run: `npm run typecheck && npm run build`, `npm run dev` — record an e-load with commission, confirm it appears in totals and dashboard revenue rises.
Expected: gate PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Services view (e-load/bills/GCash) with commission in revenue"
```

---

## Phase 4 — Barcode + receipts

### Task 11: Barcode field + scanner + POS integration

**Files:**
- Create: `src/components/BarcodeScanner.tsx`
- Modify: `src/views/Products.tsx` (barcode input), `src/views/Sales.tsx` (scan-to-add)

**Interfaces:**
- Consumes: `useStore`, `Product.barcode`.
- Produces: `<BarcodeScanner onScan={(code:string)=>void} />` supporting the `BarcodeDetector` camera API where available and a USB keyboard-wedge fallback (buffer keystrokes ending in Enter). POS resolves scanned `code → product.barcode` and adds to cart.

- [ ] **Step 1: Add barcode input** to the Products add/edit form; persist to `product.barcode` via the existing product action.

- [ ] **Step 2: Build `BarcodeScanner.tsx`** — feature-detect `window.BarcodeDetector`; if present, run a camera stream + detect loop and call `onScan`. Always also attach a keyboard-wedge listener: accumulate rapid keypresses, flush the buffer to `onScan` on Enter. Clean up stream/listeners on unmount.

- [ ] **Step 3: Integrate into POS** (`Sales.tsx`) — a "Scan" toggle mounts the scanner; on scan, find product by `barcode` and add to cart; if unmatched, show a brief "not found" toast.

- [ ] **Step 4: Verify gate + smoke test**

Run: `npm run typecheck && npm run build`, `npm run dev` — set a barcode on a product; type it fast + Enter (simulating a wedge) in POS; confirm it adds to the cart.
Expected: gate PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: barcode field, scanner component, POS scan-to-add"
```

---

### Task 12: Printable / shareable receipt

**Files:**
- Create: `src/components/Receipt.tsx`
- Modify: `src/views/Sales.tsx` (show receipt after checkout), `src/views/Settings.tsx` (receipt header fields), `src/index.css` (print styles)

**Interfaces:**
- Consumes: a completed `Sale`, `settings.receipt` (store name/address/contact/footer).
- Produces: `<Receipt sale={Sale} />` rendering an on-screen receipt with **Print** (`window.print()`, print-only CSS) and **Share** (Web Share API with clipboard fallback).

- [ ] **Step 1: Add receipt settings** in `Settings.tsx` — store name, address, contact, footer note → `settings.receipt`.

- [ ] **Step 2: Build `Receipt.tsx`** — header from `settings.receipt`, line items, totals, payment, timestamp; Print and Share buttons. Add a `@media print` block in `index.css` that hides app chrome and shows only `.receipt`.

- [ ] **Step 3: Show after checkout** in `Sales.tsx` — on completed sale, offer "View receipt" opening `<Receipt>` for that sale.

- [ ] **Step 4: Verify gate + smoke test**

Run: `npm run typecheck && npm run build`, `npm run dev` — complete a sale, open receipt, trigger print preview (chrome hidden), confirm Share/copy works.
Expected: gate PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: printable/shareable receipts with store header"
```

---

## Phase 5 — Staff + suki loyalty

### Task 13: Loyalty selectors (TDD)

**Files:**
- Create: `src/lib/loyalty.ts`, `src/lib/loyalty.test.ts`

**Interfaces:**
- Consumes: loyalty config (`pesosPerPoint`, `pointValue`, `enabled`) from settings.
- Produces: `pointsEarned(total, cfg): number` and `redeemValue(points, cfg): number`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { pointsEarned, redeemValue } from './loyalty'

const cfg = { enabled: true, pesosPerPoint: 50, pointValue: 1 } // 1 pt / ₱50; 1 pt = ₱1

describe('loyalty', () => {
  it('earns floor(total / pesosPerPoint)', () => {
    expect(pointsEarned(275, cfg)).toBe(5)
  })
  it('earns nothing when disabled', () => {
    expect(pointsEarned(275, { ...cfg, enabled: false })).toBe(0)
  })
  it('redeems points at pointValue', () => {
    expect(redeemValue(5, cfg)).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/loyalty.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/loyalty.ts`**

```ts
export interface LoyaltyCfg { enabled: boolean; pesosPerPoint: number; pointValue: number }

export function pointsEarned(total: number, cfg: LoyaltyCfg): number {
  if (!cfg.enabled || cfg.pesosPerPoint <= 0) return 0
  return Math.floor(total / cfg.pesosPerPoint)
}

export function redeemValue(points: number, cfg: LoyaltyCfg): number {
  return Math.max(0, Math.floor(points)) * cfg.pointValue
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/loyalty.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/loyalty.ts src/lib/loyalty.test.ts
git commit -m "feat: loyalty earn/redeem selectors with tests"
```

---

### Task 14: Loyalty in POS + staff roles in Settings

**Files:**
- Modify: `src/views/Sales.tsx` (award/redeem points), `src/views/Utang.tsx` (show points), `src/views/Settings.tsx` (loyalty config + staff list + role switch), `src/App.tsx`/`src/Mobile.tsx` (gate owner-only views by role)

**Interfaces:**
- Consumes: `pointsEarned`, `redeemValue`; `settings.loyalty`, `settings.staff`, current role.
- Produces: POS awards points to the sale's customer and can redeem points as a discount; Settings manages loyalty config, staff list (owner/cashier), and an active-role switch; owner-only views (Reports, Settings, Cash Flow) are hidden for cashier role.

- [ ] **Step 1: Loyalty config UI** in `Settings.tsx` — enabled toggle, `pesosPerPoint`, `pointValue` → `settings.loyalty`.

- [ ] **Step 2: POS integration** in `Sales.tsx` — when a customer is attached, on checkout add `pointsEarned(total, cfg)` to `customer.points`; offer "Redeem points" applying `redeemValue` as a discount and deducting the points.

- [ ] **Step 3: Show points** on the customer row in `Utang.tsx`.

- [ ] **Step 4: Staff + role gating** — Settings staff list (name + role); an active-role selector stored in settings/local state; in `App.tsx`/`Mobile.tsx` hide Reports/Settings/Cash Flow nav entries when active role is `cashier`.

- [ ] **Step 5: Verify gate + smoke test**

Run: `npm run typecheck && npm run build`, `npm run dev` — enable loyalty, ring a sale for a customer, confirm points awarded and redeemable; switch to cashier role and confirm owner-only views hide.
Expected: gate PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: suki loyalty in POS and staff roles in Settings"
```

---

## Phase 6 — Live-mode schema & deployment runbook

### Task 15: `tp_` Supabase schema

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Consumes: the data model (spec §5).
- Produces: full SQL for live mode — `tp_settings`, `tp_products` (+`barcode`), `tp_customers` (+`points`), `tp_sales`, `tp_movements`, `tp_services`, `tp_expenses`, `tp_purchases`; per-table RLS `auth.uid() = store_id`; indexes; `product-photos` storage bucket + policies.

- [ ] **Step 1: Fetch SukiBook's `supabase/schema.sql`** as the base; rename all tables `sb_` → `tp_`; add `barcode` to products and `points` to customers.

- [ ] **Step 2: Add the three new tables** with `store_id` FK, RLS "owner full access", and `(store_id, ts desc)` indexes, mirroring the existing tables' policy style.

- [ ] **Step 3: Sanity-check** the SQL parses (paste-review; no execution needed here).

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: tp_ Supabase schema for live mode"
```

---

### Task 16: DEPLOYMENT.md runbook

**Files:**
- Create: `DEPLOYMENT.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a TindahanPro deployment runbook (demo-first, then live).

- [ ] **Step 1: Write `DEPLOYMENT.md`** — adapt SukiBook's structure: prerequisites, demo deploy (no env vars), live mode (create Supabase project, run `supabase/schema.sql`, set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel), sync/offline-first explanation, security (RLS + anon key), and costs. All copy says TindahanPro.

- [ ] **Step 2: Verify gate** (docs-only, but confirm build still green)

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit + redeploy**

```bash
git add DEPLOYMENT.md
git commit -m "docs: TindahanPro deployment runbook"
```
Push; Vercel auto-redeploys the latest demo build.

**➡️ Milestone: full OS feature set live in demo mode; live-mode ready to wire when the user provides Supabase credentials.**

---

## Self-Review (author's check against spec)

- **Spec coverage:** §3 architecture → Tasks 1–4; §5 model → Task 2 + Task 15; §6.1 Cash Flow → Tasks 7–8; §6.2 Services → Tasks 9–10; §6.3 Barcode/Receipts → Tasks 11–12; §6.4 Staff/Loyalty → Tasks 13–14; §8 tests → Tasks 7/9/13 (Vitest); §9 deployment → Tasks 5–6, 15–16; §10 build order → phase order. No gaps.
- **Placeholder scan:** no TBD/TODO; porting steps name exact raw URLs and rebrand rules; test/impl code is concrete.
- **Type consistency:** `Service`/`Expense`/`Purchase` and `DB.services/expenses/purchases` defined in Task 2 and used identically in Tasks 7–10, 15; loyalty `LoyaltyCfg` fields (`enabled`, `pesosPerPoint`, `pointValue`) consistent across Tasks 13–14; `netCashFlow`, `serviceCommissionTotal`, `pointsEarned`, `redeemValue` names stable across producer and consumer tasks.
