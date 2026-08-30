# TindahanPro — Deployment Runbook

This is the operational guide for running, deploying, and (optionally) enabling cloud sync for **TindahanPro**, the Store OS for Philippine sari-sari stores.

## 1. Overview: two modes

TindahanPro runs in one of two modes, chosen automatically at build time based on whether Supabase credentials are present:

| | **Demo mode** (default, live today) | **Live mode** (opt-in) |
|---|---|---|
| Storage | Browser `localStorage` only | Supabase Postgres, cloud-synced |
| Auth | None — anyone with the URL can use it | Supabase magic-link (passwordless email) |
| Backend | None | Supabase (Postgres + Auth + Storage) |
| Env vars required | None | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Data survives across devices? | No — data lives in one browser | Yes — synced per store owner |
| What's live now | **https://tindahan-pro.vercel.app runs in this mode today** | Not yet enabled on the live deployment |

Both modes ship from the same codebase and the same build — the app detects at runtime whether both Supabase env vars are set and falls back to demo mode automatically if they aren't. No code changes are needed to switch between them.

## 2. Prerequisites

- **Node.js 18+** and npm
- A **GitHub** account (the repo `nhads18/TindahanPro` already lives here)
- A **Vercel** account, git-linked to the GitHub repo (already set up — see §4)
- For live mode only: a **Supabase** account and project

The free tiers of Vercel and Supabase are enough to run and pilot a single store — no paid plan is required to get started.

## 3. Local development

```bash
git clone https://github.com/nhads18/TindahanPro.git
cd TindahanPro
npm install
npm run dev
```

This starts the Vite dev server in **demo mode** by default (no environment variables needed). Open the printed local URL in your browser — all data is stored in that browser's `localStorage`.

Other useful scripts:

```bash
npm run build      # production build to dist/
npm run typecheck  # TypeScript check, no emit
npm run test       # run the test suite
```

## 4. Deploy (demo mode) — already set up

This is the path the live deployment already uses, and it needs no further action to keep working:

1. The GitHub repo `nhads18/TindahanPro` is **git-linked to a Vercel project**.
2. Every push to the `main` branch triggers an automatic Vercel build and deploy (build settings come from `vercel.json` — a standard Vite SPA build).
3. **No environment variables are required** for this path. Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in the Vercel project, the app builds and runs in demo mode automatically.
4. The result is what's live at https://tindahan-pro.vercel.app today.

To ship a change: commit to `main` (or merge a PR into it) and push — Vercel takes care of the rest. No manual deploy step is needed.

## 5. Enable live mode

Live mode adds Supabase-backed auth and cloud sync on top of the same app. It is opt-in and does not change anything about the demo deployment until you complete these steps.

### 5.1 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (the free tier is enough to start).
2. Wait for provisioning to finish, then open the project's **SQL Editor**.

### 5.2 Run the schema

1. Open `supabase/schema.sql` from this repo.
2. Paste its full contents into the Supabase SQL Editor and run it.

This creates:

- The `tp_settings`, `tp_products`, `tp_customers`, `tp_sales`, and `tp_movements` tables (plus `tp_services`, `tp_expenses`, and `tp_purchases` — see the known limitation in §7), each scoped to a store via a `store_id uuid` column.
- Indexes to keep reports fast as data grows.
- **Row Level Security (RLS)** policies on every table: `auth.uid() = store_id`, so each authenticated user can only ever see and write their own store's rows.
- A `product-photos` storage bucket with policies for public read and owner-only upload/delete.

The schema file's closing comment also has a reminder: in **Authentication → Providers → Email**, make sure **Magic Link** is enabled (it is on by default for new Supabase projects).

### 5.3 Collect your credentials

In the Supabase dashboard, go to **Project Settings → API** and copy:

- **Project URL** → this is `VITE_SUPABASE_URL`
- **anon public key** → this is `VITE_SUPABASE_ANON_KEY`

### 5.4 Set environment variables in Vercel

1. Open the TindahanPro project in the Vercel dashboard.
2. Go to **Settings → Environment Variables**.
3. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
4. Redeploy (trigger a new deployment, or push any commit to `main`) so the build picks up the new env vars — Vite inlines `VITE_*` variables at build time, so an existing deployment won't pick them up without a rebuild.

Once both variables are present in the build, the app switches to live mode automatically: visitors are asked to sign in (magic link) instead of dropping straight into a local session.

### 5.5 Why the anon key is safe to expose

The Supabase `anon` key is meant to be public — it ships inside the built JS bundle and is visible to anyone. It stays safe here because **every table has RLS enabled** with a single rule: `auth.uid() = store_id`. A signed-in user's queries only ever touch rows where `store_id` matches their own auth id, so the anon key alone can't read or write another store's data. There's no separate "service role" key anywhere in the frontend build.

### 5.6 Magic-link auth

Live mode uses **passwordless email sign-in**: a user enters their email, Supabase sends a one-time magic link, and clicking it signs them in (and creates their account on first use). There's no password to set, store, or reset.

## 6. How sync works

TindahanPro is **offline-first** in both modes:

- The app always reads and writes to a local database first (backed by `localStorage`), so the UI never blocks on a network round-trip — it works the same whether or not you're online.
- In live mode, changes are **debounce-pushed** to Supabase in the background after local writes settle, and the full store is **pulled from Supabase on login** to hydrate that device.
- Push currently uses a simple replace-all strategy per collection (delete the store's rows, insert the current set) — correct and fast enough at sari-sari-store scale, where a single store's daily data is small.

## 7. Known limitation — partial cloud sync

Being upfront about the current state of live mode:

- **Fully wired for cloud sync:** products, customers, sales, and stock movements. These round-trip to Supabase (`tp_products`, `tp_customers`, `tp_sales`, `tp_movements`) on every push/pull in live mode.
- **Not yet syncing to the cloud:** the newer **Services** (e-load / bills / GCash), **Expenses**, and **Purchases** records. Their tables (`tp_services`, `tp_expenses`, `tp_purchases`) exist in `supabase/schema.sql` and are ready to receive data, but the app's sync layer (`src/lib/supabase.ts`) does not yet push or pull them — it keeps them local-only and merges them back in from device state on every login so signing in never wipes that data.
- **In demo/local mode, all seven record types work fully** — this limitation only affects cross-device sync in live mode.

Wiring these three collections into `pushStore` / `pullStore` (mirroring the pattern already used for products, customers, sales, and movements) is the remaining work to reach full live-mode parity.

## 8. Costs

- **Vercel:** the Hobby (free) tier is sufficient for a demo deployment and light production traffic.
- **Supabase:** the free tier includes a Postgres database, auth, and storage, enough to pilot live mode for one or a handful of stores. Upgrade only if you outgrow its usage limits.

No paid services are required to run TindahanPro in either mode.
