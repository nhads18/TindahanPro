import { useMemo, useState } from "react";
import { peso, peso0, fmtDay, type Purchase } from "../lib/data";
import { expensesByCategory, netCashFlow } from "../lib/cashflow";
import { useStore } from "../lib/store";
import { Field, Reveal } from "../components/ui";
import { IconDown, IconPlus, IconTrash, IconUp, IconWallet } from "../components/Icons";

const EXPENSE_CATS = ["rent", "utilities", "transport", "supplies", "other"] as const;
type ExpenseCat = (typeof EXPENSE_CATS)[number];

const CAT_LABEL: Record<ExpenseCat, string> = {
  rent: "Rent",
  utilities: "Utilities",
  transport: "Transport",
  supplies: "Supplies",
  other: "Other",
};

type Tab = "expenses" | "purchases";
type Line = { product_id: string; qty: string; unit_cost: string };

export default function CashFlow() {
  const { db, addExpense, addPurchase } = useStore();
  const [tab, setTab] = useState<Tab>("expenses");

  const flow = useMemo(() => netCashFlow(db), [db]);
  const byCat = useMemo(() => expensesByCategory(db), [db]);

  /* ---------------- expense form ---------------- */
  const [eCat, setECat] = useState<ExpenseCat>("supplies");
  const [eAmount, setEAmount] = useState("");
  const [eNote, setENote] = useState("");

  const submitExpense = () => {
    const amount = parseFloat(eAmount);
    if (!(amount > 0)) return;
    addExpense({ category: eCat, amount, note: eNote.trim() || undefined });
    setEAmount("");
    setENote("");
  };

  /* ---------------- purchase form ---------------- */
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", qty: "1", unit_cost: "" }]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { product_id: "", qty: "1", unit_cost: "" }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const purchaseTotal = lines.reduce((s, l) => {
    const qty = parseFloat(l.qty);
    const cost = parseFloat(l.unit_cost);
    return s + (qty > 0 && cost >= 0 ? qty * cost : 0);
  }, 0);

  const submitPurchase = () => {
    if (!supplier.trim()) return;
    const items = lines
      .filter((l) => l.product_id && parseInt(l.qty, 10) > 0)
      .map((l) => {
        const prod = db.products.find((p) => p.id === l.product_id)!;
        const qty = parseInt(l.qty, 10);
        const unit_cost = Math.max(0, parseFloat(l.unit_cost) || 0);
        return { product_id: prod.id, name: prod.name, qty, unit_cost };
      });
    if (!items.length) return;
    addPurchase({
      supplier: supplier.trim(),
      total: items.reduce((s, it) => s + it.qty * it.unit_cost, 0),
      items,
    });
    setSupplier("");
    setLines([{ product_id: "", qty: "1", unit_cost: "" }]);
  };

  return (
    <div className="space-y-5">
      {/* summary */}
      <Reveal>
        <div className="rounded-xl border border-line bg-pine p-5 text-card shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-mango">
                <IconWallet className="h-4 w-4" /> Net cash flow
              </p>
              <p className={`mt-1 font-mono text-3xl font-bold ${flow.net >= 0 ? "text-mango" : "text-cherry-soft"}`}>
                {peso0(flow.net)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-4">
              <div>
                <p className="text-card/60">Revenue</p>
                <p className="tnum font-mono font-bold text-leaf">{peso0(flow.revenue)}</p>
              </div>
              <div>
                <p className="text-card/60">Services commission</p>
                <p className="tnum font-mono font-bold text-leaf">{peso0(flow.serviceCommission)}</p>
              </div>
              <div>
                <p className="text-card/60">Expenses</p>
                <p className="tnum font-mono font-bold text-cherry-soft">-{peso0(flow.expenses)}</p>
              </div>
              <div>
                <p className="text-card/60">Purchases</p>
                <p className="tnum font-mono font-bold text-cherry-soft">-{peso0(flow.purchaseCost)}</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* tabs */}
      <Reveal delay={60}>
        <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
          {(["expenses", "purchases"] as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`btn-press rounded-md px-4 py-1.5 text-xs font-bold capitalize transition ${
                tab === k ? "bg-pine text-mango shadow-sm" : "text-ink-soft hover:bg-card hover:text-ink"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </Reveal>

      {tab === "expenses" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-7" delay={100}>
            <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-lg font-bold">Log an expense</h2>
                <p className="text-xs text-ink-soft">Rent, ilaw, tricycle — bawat piso, may tala</p>
              </div>
              <div className="space-y-3.5 p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Category</span>
                    <select value={eCat} onChange={(e) => setECat(e.target.value as ExpenseCat)} className="field">
                      {EXPENSE_CATS.map((c) => (
                        <option key={c} value={c}>{CAT_LABEL[c]}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Amount ₱" type="number" step="0.25" value={eAmount} onChange={(e) => setEAmount(e.target.value)} placeholder="150" />
                  <div className="col-span-2 sm:col-span-1">
                    <Field label="Note (optional)" value={eNote} onChange={(e) => setENote(e.target.value)} placeholder="e.g. Meralco" />
                  </div>
                </div>
                <button
                  onClick={submitExpense}
                  disabled={!(parseFloat(eAmount) > 0)}
                  className="btn-press inline-flex items-center gap-2 rounded-lg bg-mango px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-pine-deep transition enabled:hover:bg-mango-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconPlus className="h-4 w-4" /> Add expense
                </button>
              </div>
              <div className="max-h-[420px] overflow-y-auto border-t border-line">
                {db.expenses.length === 0 ? (
                  <p className="px-5 py-6 text-center text-xs text-ink-soft">No expenses logged yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {db.expenses.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-5 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cherry-soft text-cherry">
                          <IconDown className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold capitalize">{CAT_LABEL[e.category as ExpenseCat] ?? e.category}</p>
                          <p className="truncate text-[11px] text-ink-soft">{e.note || fmtDay(e.ts)}</p>
                        </div>
                        <span className="tnum shrink-0 font-mono text-sm font-bold text-cherry">-{peso0(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-5" delay={140}>
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold">By category</h2>
              <p className="mb-4 text-xs text-ink-soft">Where your gastos is going</p>
              {Object.keys(byCat).length === 0 ? (
                <p className="text-xs text-ink-soft">Nothing logged yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {Object.entries(byCat)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => {
                      const pct = flow.expenses > 0 ? (amount / flow.expenses) * 100 : 0;
                      return (
                        <li key={cat}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold capitalize">{CAT_LABEL[cat as ExpenseCat] ?? cat}</span>
                            <span className="tnum font-mono font-bold">{peso0(amount)}</span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-paper">
                            <div className="width-grow h-full rounded-full bg-cherry" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </Reveal>
        </div>
      )}

      {tab === "purchases" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-7" delay={100}>
            <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-lg font-bold">Log a supplier purchase</h2>
                <p className="text-xs text-ink-soft">Restocking a delivery adds items straight to your shelf</p>
              </div>
              <div className="space-y-3.5 p-5">
                <Field label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Coca-Cola distributor" />
                <div className="space-y-2.5">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Line items</span>
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={l.product_id}
                        onChange={(e) => setLine(i, { product_id: e.target.value })}
                        className="field min-w-0 flex-1"
                      >
                        <option value="">— product —</option>
                        {db.products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        value={l.qty}
                        onChange={(e) => setLine(i, { qty: e.target.value })}
                        type="number"
                        placeholder="Qty"
                        className="field w-20 px-2 py-1.5 text-sm"
                      />
                      <input
                        value={l.unit_cost}
                        onChange={(e) => setLine(i, { unit_cost: e.target.value })}
                        type="number"
                        step="0.25"
                        placeholder="₱ cost"
                        className="field w-24 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                        aria-label="Remove line"
                        className="btn-press shrink-0 rounded-md p-1.5 text-ink-soft transition hover:bg-cherry-soft hover:text-cherry disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addLine}
                    className="btn-press inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[11px] font-bold text-ink-soft transition hover:border-pine hover:bg-pine-soft"
                  >
                    <IconPlus className="h-3.5 w-3.5" /> Add line
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-paper px-3.5 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">Total</span>
                  <span className="tnum font-mono text-lg font-bold">{peso(purchaseTotal)}</span>
                </div>
                <button
                  onClick={submitPurchase}
                  disabled={!supplier.trim() || purchaseTotal <= 0}
                  className="btn-press inline-flex items-center gap-2 rounded-lg bg-mango px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-pine-deep transition enabled:hover:bg-mango-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconPlus className="h-4 w-4" /> Record purchase &amp; restock
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-5" delay={140}>
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold">Recent purchases</h2>
              <p className="mb-4 text-xs text-ink-soft">{db.purchases.length} recorded</p>
              {db.purchases.length === 0 ? (
                <p className="text-xs text-ink-soft">No purchases logged yet.</p>
              ) : (
                <ul className="max-h-[420px] space-y-2.5 overflow-y-auto">
                  {db.purchases.map((p: Purchase) => (
                    <li key={p.id} className="rounded-lg border border-line bg-paper/60 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{p.supplier}</p>
                        <span className="tnum shrink-0 font-mono text-sm font-bold text-leaf">
                          <IconUp className="mr-1 inline h-3 w-3" />{peso0(p.total)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        {fmtDay(p.ts)} · {p.items.reduce((s, it) => s + it.qty, 0)} units · {p.items.length} item{p.items.length === 1 ? "" : "s"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        </div>
      )}
    </div>
  );
}
