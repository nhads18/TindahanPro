# TindahanPro

**TindahanPro** is a Store OS for Philippine sari-sari (neighborhood) stores — point of sale, inventory, and *utang* (customer credit) tracking in one lightweight, offline-friendly web app.

## Features

- **Dashboard** — today's sales, low-stock alerts, and a quick view of what's happening in the store.
- **POS / Sales** — fast checkout flow for ringing up items and recording payments.
- **Products** — manage the product catalog: name, category, price, cost, and stock on hand.
- **Stock** — record stock movements (restocks, adjustments, spoilage) and keep inventory accurate.
- **Utang (credit ledger)** — track customer balances, payments, and purchase history for suki (regular customers) who buy on credit.
- **Reports** — sales and inventory summaries over time.
- **Settings** — store profile and app preferences.

### Coming to the OS

The following modules are part of the TindahanPro Store OS roadmap and are not yet built:

- E-load, bills payment, and GCash/e-wallet services
- Cash flow tracking (expenses and purchases)
- Barcode scanning and printed receipts
- Staff accounts and customer loyalty

## Demo mode vs. Live mode

TindahanPro runs in one of two modes, decided automatically at build time:

- **Demo mode** (default) — all data is stored locally in the browser via `localStorage`. There is no backend and no environment variables are required. This is what you get out of the box with `npm run dev` or a plain deploy, and it's ideal for trying out the app or running a single-device store.
- **Live mode** — when Supabase credentials are supplied, the app authenticates users and syncs data (products, customers, sales, stock movements, settings) to a Supabase Postgres database, with Supabase Storage available for file assets. Live mode is enabled by setting two environment variables at build time:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

  Without both of these set, the app falls back to demo mode automatically — no code changes needed.

## Local development

```bash
npm install
npm run dev
```

This starts the Vite dev server in demo mode (no environment variables needed). Open the printed local URL in your browser.

Other useful scripts:

```bash
npm run build      # production build to dist/
npm run typecheck  # TypeScript check, no emit
npm run test       # run the test suite
```

## Deployment

TindahanPro is set up to deploy to Vercel as a Vite single-page app (see `vercel.json`). Deployment steps, environment variable setup for live mode, and Supabase provisioning are covered in [`DEPLOYMENT.md`](./DEPLOYMENT.md) (added in a later task).
