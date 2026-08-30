import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { startOfDay, type DB } from "./data";

const URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** True once real Supabase credentials are provided at build time (Vercel env vars). */
export const isCloudConfigured = (): boolean =>
  URL.startsWith("http") && ANON.length > 20;

export const supa: SupabaseClient | null = isCloudConfigured()
  ? createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export type CloudUser = { id: string; email: string };

export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!supa) return { ok: false, error: "Supabase is not configured" };
  const { error } = await supa.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOutUser(): Promise<void> {
  if (supa) await supa.auth.signOut();
}

/** Subscribe to auth changes. Returns an unsubscribe function. */
export function onAuthChange(cb: (user: CloudUser | null) => void): () => void {
  if (!supa) return () => undefined;
  const { data } = supa.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    cb(u ? { id: u.id, email: u.email ?? "" } : null);
  });
  return () => data.subscription.unsubscribe();
}

/* ------------------------------------------------------------------ */
/* Row shapes (snake_case ↔ app types)                                 */
/* ------------------------------------------------------------------ */

type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  cat: string;
  price: number;
  cost: number;
  stock: number;
};

type CustomerRow = {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  balance: number;
  history: DB["customers"][number]["history"];
};

type SaleRow = {
  id: string;
  store_id: string;
  ts: string;
  payment: string;
  total: number;
  customer_id: string | null;
  items: DB["sales"][number]["items"];
};

type MovementRow = {
  id: string;
  store_id: string;
  ts: string;
  product_id: string | null;
  name: string;
  type: string;
  qty: number;
  sale_id: string | null;
};

export interface StoreBundle {
  products: DB["products"];
  customers: DB["customers"];
  sales: DB["sales"];
  movements: DB["movements"];
  services: DB["services"];
  expenses: DB["expenses"];
  purchases: DB["purchases"];
}

/**
 * The tp_services / tp_expenses / tp_purchases tables are not part of the
 * Supabase schema yet (added in a later task). Until then these three
 * collections are kept local-only: pull/push never touch the network for
 * them, but they still round-trip through StoreBundle so callers (and
 * normalizeDB) never have to special-case cloud vs. demo mode.
 */

const iso = (ms: number) => new Date(ms).toISOString();

export function toRows(storeId: string, db: DB): {
  products: ProductRow[];
  customers: CustomerRow[];
  sales: SaleRow[];
  movements: MovementRow[];
} {
  return {
    products: db.products.map((p) => ({
      id: p.id,
      store_id: storeId,
      name: p.name,
      cat: p.cat,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
    })),
    customers: db.customers.map((c) => ({
      id: c.id,
      store_id: storeId,
      name: c.name,
      phone: c.phone,
      balance: c.balance,
      history: c.history,
    })),
    sales: db.sales.map((s) => ({
      id: s.id,
      store_id: storeId,
      ts: iso(s.ts),
      payment: s.payment,
      total: s.total,
      customer_id: s.customerId ?? null,
      items: s.items,
    })),
    movements: db.movements.map((m) => ({
      id: m.id,
      store_id: storeId,
      ts: iso(m.ts),
      product_id: m.productId ?? null,
      name: m.name,
      type: m.type,
      qty: m.qty,
      sale_id: (m as { saleId?: string }).saleId ?? null,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Pull / push — offline-first, last-write-wins per the spec           */
/* ------------------------------------------------------------------ */

/** Returns null when the remote store is empty (first login). */
export async function pullStore(storeId: string): Promise<{ bundle: StoreBundle | null; settings: Record<string, unknown> | null }> {
  if (!supa) throw new Error("Supabase is not configured");
  const [p, c, s, m, st] = await Promise.all([
    supa.from("tp_products").select("*").eq("store_id", storeId),
    supa.from("tp_customers").select("*").eq("store_id", storeId),
    supa.from("tp_sales").select("*").eq("store_id", storeId).order("ts", { ascending: false }),
    supa.from("tp_movements").select("*").eq("store_id", storeId).order("ts", { ascending: false }),
    supa.from("tp_settings").select("*").eq("store_id", storeId).maybeSingle(),
  ]);
  for (const r of [p, c, s, m, st] as const) {
    if (r.error) throw new Error(r.error.message);
  }

  const empty =
    (p.data?.length ?? 0) === 0 &&
    (c.data?.length ?? 0) === 0 &&
    (s.data?.length ?? 0) === 0;

  if (empty) return { bundle: null, settings: (st.data?.settings as Record<string, unknown>) ?? null };

  return {
    bundle: {
      // tp_services / tp_expenses / tp_purchases don't exist in Supabase yet
      // (schema lands in a later task) — returned empty here so StoreBundle
      // is always fully shaped; the caller in store.tsx merges these back
      // from local state on hydrate so a login never wipes device-only data.
      services: [],
      expenses: [],
      purchases: [],
      products: ((p.data ?? []) as ProductRow[]).map((r) => ({
        id: r.id,
        name: r.name,
        cat: r.cat as DB["products"][number]["cat"],
        price: Number(r.price),
        cost: Number(r.cost),
        stock: r.stock,
      })),
      customers: ((c.data ?? []) as CustomerRow[]).map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone ?? "",
        balance: Number(r.balance),
        history: r.history ?? [],
      })),
      sales: ((s.data ?? []) as SaleRow[]).map((r) => ({
        id: r.id,
        ts: Date.parse(r.ts),
        payment: r.payment as DB["sales"][number]["payment"],
        total: Number(r.total),
        customerId: r.customer_id ?? undefined,
        items: r.items ?? [],
      })),
      movements: ((m.data ?? []) as MovementRow[]).map((r) => ({
        id: r.id,
        ts: Date.parse(r.ts),
        productId: r.product_id ?? "",
        name: r.name,
        type: r.type as DB["movements"][number]["type"],
        qty: r.qty,
        ...(r.sale_id ? { saleId: r.sale_id } : {}),
      })),
    },
    settings: (st.data?.settings as Record<string, unknown>) ?? null,
  };
}

/** Replace-all push per collection — correct & simple at sari-sari scale. */
export async function pushStore(
  storeId: string,
  db: DB,
  settings: Record<string, unknown>,
): Promise<void> {
  if (!supa) throw new Error("Supabase is not configured");
  const rows = toRows(storeId, db);

  // NOTE (Ruling R4 remainder): db.services / db.expenses / db.purchases are
  // intentionally NOT pushed here — tp_services, tp_expenses and tp_purchases
  // don't exist as Supabase tables yet (schema is added in a later task).
  // Once those tables land, mirror the pattern below: build row shapes in
  // toRows(), delete-then-insert them here, and stop merging them from local
  // state in store.tsx's cloud hydrate.

  // delete current remote rows for this store…
  const dels = await Promise.all([
    supa.from("tp_products").delete().eq("store_id", storeId),
    supa.from("tp_customers").delete().eq("store_id", storeId),
    supa.from("tp_sales").delete().eq("store_id", storeId),
    supa.from("tp_movements").delete().eq("store_id", storeId),
  ]);
  for (const d of dels) if (d.error) throw new Error(d.error.message);

  // …then insert the fresh set + settings (upsert single row).
  const inserts = await Promise.all([
    rows.products.length ? supa.from("tp_products").insert(rows.products) : Promise.resolve({ error: null }),
    rows.customers.length ? supa.from("tp_customers").insert(rows.customers) : Promise.resolve({ error: null }),
    rows.sales.length ? supa.from("tp_sales").insert(rows.sales) : Promise.resolve({ error: null }),
    rows.movements.length ? supa.from("tp_movements").insert(rows.movements) : Promise.resolve({ error: null }),
    supa.from("tp_settings").upsert({
      store_id: storeId,
      settings,
      updated_at: iso(Date.now()),
    }),
  ]);
  for (const i of inserts) if (i.error) throw new Error(i.error.message);
}

/** Fresh local anchor used when hydrating from the cloud. */
export const freshAnchor = () => new Date(startOfDay(Date.now())).toDateString();
