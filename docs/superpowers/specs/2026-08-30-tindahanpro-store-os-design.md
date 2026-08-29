# TindahanPro — Sari-Sari Store OS — Design Spec

**Date:** 2026-08-30
**Status:** Approved design → ready for implementation plan
**Origin:** Evolution of [SukiBook](https://github.com/nhads18/SukiBook) (Approach A: port & extend)

---

## 1. Summary

TindahanPro is a Sari-Sari Store **OS** for Philippine SME neighborhood
stores. It evolves the existing SukiBook Sari-Sari Store Manager by
porting its proven offline-first React + Supabase codebase, rebranding
it, and adding four new capability modules: **E-load & bills/GCash
services**, **Expenses & purchases (cash flow)**, **Barcode scanning &
receipts**, and **Staff roles & suki loyalty**.

The app runs fully in **demo mode** (localStorage, no backend) so it can
be deployed live to Vercel immediately, with Supabase live-sync wired in
afterward.

## 2. Goals & Non-Goals

### Goals
- Faithfully port SukiBook's working architecture (offline-first sync,
  demo mode, existing views) into a new TindahanPro project.
- Add the four approved feature modules, each self-contained and testable.
- Ship a working demo-mode build deployable to Vercel with **zero env vars**.
- Keep the Supabase schema ready for live mode (per-store RLS), even
  though live mode is deferred.

### Non-Goals (this phase)
- Full multi-user staff authentication (multiple auth.users per store).
  Staff roles are modeled in settings/local state now; true multi-user
  auth is deferred to a later live-mode phase.
- Native mobile apps (the app is a responsive/PWA-capable web app).
- Payment gateway integration (GCash/e-load are tracked as ledger
  entries, not processed through an API).
- Automated end-to-end/browser tests (unit tests cover new selector math).

## 3. Architecture

Same stack as SukiBook:

- **Build/Runtime:** Vite 6 + React 18 + TypeScript 5 + Tailwind CSS v4
- **Libraries:** framer-motion, recharts, lucide-react, @dnd-kit/*,
  date-fns, canvas-confetti, uuid, @supabase/supabase-js
- **State:** a single React context (`store.tsx`) holding a root `DB`
  object. Offline-first: every mutation writes the local DB
  (localStorage) synchronously; in live mode a debounced (~1.5s) push
  syncs to Supabase and a pull hydrates on authenticated load.
- **Backend (deferred):** Supabase Auth (magic link) + Postgres +
  Storage. Row Level Security on every table: `auth.uid() = store_id`.
- **Deploy:** Vercel static SPA build. With no `VITE_SUPABASE_*` env
  vars present, the app stays in demo mode and is fully usable.

### Data flow
```
User action (sale / service / expense / purchase / restock)
    → mutate local DB (reducer/context)
    → persist to localStorage (synchronous)
    → [live mode only] debounced push to Supabase
Login (live mode) → pull from Supabase → hydrate local DB
```
Barcode scan (device camera or USB HID keyboard-wedge scanner) resolves
`barcode → product` inside the POS view. Receipts render client-side
from a completed sale into a printable / shareable view. No custom
backend server is operated.

## 4. Project structure

```
src/
  main.tsx            app entry
  App.tsx             desktop shell / routing
  Mobile.tsx          mobile shell
  index.css           Tailwind entry + theme
  lib/
    data.ts           TypeScript types + derived selectors
    store.tsx         state context + offline-first sync engine
    supabase.ts       Supabase client + demo-mode guard
    i18n.ts           English / Filipino strings
  components/
    ui.tsx            shared UI primitives
    Icons.tsx         icon set
    charts.tsx        recharts wrappers
    LoginGate.tsx     magic-link auth gate (live mode)
    Receipt.tsx       (NEW) printable/shareable receipt
    BarcodeScanner.tsx(NEW) camera + keyboard-wedge capture
  views/
    Dashboard.tsx     KPIs + charts (extended for new cash flow)
    Sales.tsx         POS (extended: barcode, receipt, loyalty)
    Products.tsx      inventory (extended: barcode field)
    Stock.tsx         stock movements (fed by purchases)
    Utang.tsx         credit ledger (extended: suki points)
    Reports.tsx       reporting (extended for services/expenses)
    Settings.tsx      settings (extended: staff, loyalty, receipt info)
    Services.tsx      (NEW) e-load / bills / gcash cash-in/out
    CashFlow.tsx      (NEW) expenses + supplier purchases
```

## 5. Data model

`tp_`-prefixed Supabase tables (renamed from `sb_`). TypeScript `DB`
root object mirrors these plus derived selectors.

### Inherited (rebranded)
- **products**: `id, name, cat, price, cost, stock, photo_url,
  created_at, updated_at` — **+ `barcode` (text, optional)**
- **customers**: `id, name, phone, balance, history, created_at`
  — **+ `points` (number, default 0)** for suki loyalty
- **sales**: `id, ts, payment('cash'|'gcash'|'utang'), total,
  customer_id, items, voided_at`
- **movements**: `id, ts, product_id, name, type('sale'|'restock'), qty,
  sale_id`
- **settings**: `store_id, settings(jsonb), updated_at` — jsonb gains
  `loyalty` (peso-per-point, redemption rate, enabled), `staff[]`
  (name, role: 'owner'|'cashier'), and `receipt` (store name, address,
  contact, footer note)

### New tables
- **services** — one row per e-load / bills / gcash transaction:
  `id, ts, kind('eload'|'bills'|'gcash_in'|'gcash_out'), provider,
  amount, commission, payment('cash'|'gcash'), note`
- **expenses** — `id, ts, category, amount, note`
- **purchases** — supplier restock / PO:
  `id, ts, supplier, total, items(jsonb of {product_id, name, qty,
  unit_cost})`. Applying a purchase creates matching `restock` movements
  and increments product stock.

All new tables carry `store_id (uuid, FK auth.users)`, RLS
"owner full access" (`auth.uid() = store_id`), and a `store_id` index
(services/expenses/purchases also indexed on `(store_id, ts desc)`).

### Derived selectors (extended)
Dashboard/Reports profit and cash-flow selectors fold in:
- **+ service commission** as revenue
- **− expenses** and **− purchase costs** as outflows
giving a true net cash-flow figure alongside the existing
revenue/profit/sales-count aggregates, low-stock alerts, and overdue
balances.

## 6. Feature modules (detail)

### 6.1 Cash Flow (expenses + purchases)
- **CashFlow** view with two tabs: Expenses log and Supplier Purchases.
- Expense entry: category (rent, utilities, transport, supplies, other),
  amount, note, date.
- Purchase entry: supplier, line items (product, qty, unit cost); on
  save, increments stock and records `restock` movements.
- Feeds Dashboard/Reports net cash-flow.

### 6.2 Services (e-load / bills / GCash)
- **Services** view: quick-entry buttons for e-load, bills payment,
  GCash cash-in, GCash cash-out.
- Each records amount + commission; commission flows into revenue.
- Running daily totals per service kind.

### 6.3 Barcode + receipts
- `barcode` field on Products (manual entry or scan-to-fill).
- **BarcodeScanner**: camera-based scan (BarcodeDetector API where
  available) and USB keyboard-wedge capture; in POS, scanning adds the
  matched product to the cart.
- **Receipt**: renders a completed sale to a printable (window.print /
  CSS) and shareable (Web Share API / copy) receipt using store info
  from settings. Client-side only.

### 6.4 Staff + suki loyalty
- **Settings** gains a staff list (name + role owner/cashier) held in
  settings; a simple local role switch gates owner-only views (Reports,
  Settings) in demo mode. Full per-user auth deferred.
- **Loyalty**: customers earn `points` per qualifying peso spent
  (configurable); points shown on Utang/customer view; redemption
  applies a discount at POS. Loyalty math lives in a tested selector.

## 7. Error handling

- **Demo-mode fallback:** any missing or failed Supabase configuration
  keeps the app in demo mode; it never hard-fails on network errors.
- **Validation:** money and quantity inputs are non-negative (matching
  Postgres CHECK constraints); voids are soft (`voided_at`) not deletes.
- **Sync:** failed pushes are retried on next debounce; local DB is the
  source of truth so no user action is ever lost offline.

## 8. Testing & quality gate

- **Gate before every Vercel deploy:** `npm run typecheck`
  (`tsc --noEmit`) and `npm run build` (`vite build`) must both pass.
- **Unit tests** (new) for the selector math that carries real logic:
  service commission totals, net cash-flow (revenue − expenses −
  purchases + commission), and loyalty points earn/redeem. Test runner:
  Vitest (added as devDependency).
- **Manual smoke test** of every view in demo mode after each module.

## 9. Deployment

Per SukiBook's runbook, adapted:
1. Scaffold, port, rebrand → `typecheck` + `build` green.
2. Push to GitHub; import to Vercel; deploy **demo mode** (no env vars)
   → live URL.
3. Build the four modules (Cash Flow → Services → Barcode/Receipts →
   Staff/Loyalty), redeploying as each lands.
4. Later (live mode): create Supabase project, run `tp_` schema SQL, set
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel.
5. Update `DEPLOYMENT.md` to TindahanPro.

**Credential boundary:** account creation and entering Supabase/Vercel
keys are done by the user; the assistant prepares the repo, schema,
runbook, and (where a connected Vercel deploy tool is available and the
user directs it) triggers the build.

## 10. Build order

1. Scaffold + port SukiBook source + rebrand → gates green
2. **Deploy to Vercel (demo mode) → early live URL**
3. Cash Flow module
4. Services module
5. Barcode + receipts
6. Staff + suki loyalty
7. Update `DEPLOYMENT.md`; optional Supabase live-mode wiring
