import { useState } from "react";
import { peso, peso0, type Payment, type Service } from "../lib/data";
import { serviceTotals, serviceCommissionTotal } from "../lib/services";
import { useStore } from "../lib/store";
import { Field, Reveal, Seg } from "../components/ui";
import { IconCheck, IconSend, IconWallet } from "../components/Icons";

type Kind = Service["kind"];
type SvcPayment = Extract<Payment, "cash" | "gcash">;

const KINDS: Kind[] = ["eload", "bills", "gcash_in", "gcash_out"];

const KIND_META: Record<Kind, { label: string; sub: string; color: string }> = {
  eload: { label: "E-load", sub: "Prepaid load — Globe, Smart, TNT, TM", color: "#2e6fd0" },
  bills: { label: "Bills payment", sub: "Meralco, water, Wifi, cable", color: "#c9463d" },
  gcash_in: { label: "GCash In", sub: "Suki cashes in — you receive cash", color: "#2f8f5b" },
  gcash_out: { label: "GCash Out", sub: "Suki cashes out — you receive GCash", color: "#d98a0b" },
};

type FormState = { amount: string; commission: string; payment: SvcPayment };
const emptyForm = (): FormState => ({ amount: "", commission: "", payment: "cash" });

export default function Services() {
  const { db, addService } = useStore();
  const [forms, setForms] = useState<Record<Kind, FormState>>({
    eload: emptyForm(),
    bills: emptyForm(),
    gcash_in: emptyForm(),
    gcash_out: emptyForm(),
  });

  const totals = serviceTotals(db);
  const commissionTotal = serviceCommissionTotal(db);

  const setForm = (kind: Kind, patch: Partial<FormState>) =>
    setForms((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));

  const submit = (kind: Kind) => {
    const f = forms[kind];
    const amount = parseFloat(f.amount);
    if (!(amount > 0)) return;
    const commission = parseFloat(f.commission) || 0;
    addService({ kind, amount, commission, payment: f.payment });
    setForm(kind, emptyForm());
  };

  return (
    <div className="space-y-5">
      {/* summary */}
      <Reveal>
        <div className="rounded-xl border border-line bg-pine p-5 text-card shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-mango">
                <IconSend className="h-4 w-4" /> Services commission
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-mango">{peso0(commissionTotal)}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-4">
              {KINDS.map((k) => (
                <div key={k}>
                  <p className="text-card/60">{KIND_META[k].label}</p>
                  <p className="tnum font-mono font-bold text-leaf">
                    {totals[k]?.count ?? 0} · {peso0(totals[k]?.commission ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* quick-entry cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {KINDS.map((k, i) => (
          <Reveal key={k} delay={i * 60}>
            <ServiceCard kind={k} form={forms[k]} onChange={(patch) => setForm(k, patch)} onSubmit={() => submit(k)} />
          </Reveal>
        ))}
      </div>

      {/* today's per-kind totals */}
      <Reveal delay={260}>
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold">Today's totals</h2>
          <p className="mb-4 text-xs text-ink-soft">Per-service count, amount &amp; commission</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  <th className="py-2">Service</th>
                  <th className="py-2 text-right">Count</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {KINDS.map((k) => {
                  const a = totals[k];
                  return (
                    <tr key={k}>
                      <td className="py-2.5 font-semibold">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: KIND_META[k].color }} />
                        {KIND_META[k].label}
                      </td>
                      <td className="tnum py-2.5 text-right font-mono">{a?.count ?? 0}</td>
                      <td className="tnum py-2.5 text-right font-mono">{peso0(a?.amount ?? 0)}</td>
                      <td className="tnum py-2.5 text-right font-mono font-bold text-leaf">{peso0(a?.commission ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function ServiceCard({
  kind,
  form,
  onChange,
  onSubmit,
}: {
  kind: Kind;
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
}) {
  const meta = KIND_META[kind];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${meta.color}1a`, color: meta.color }}
        >
          <IconWallet className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">{meta.label}</h2>
          <p className="truncate text-xs text-ink-soft">{meta.sub}</p>
        </div>
      </div>
      <div className="space-y-3.5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Amount ₱"
            type="number"
            step="0.25"
            value={form.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="100"
          />
          <Field
            label="Commission ₱"
            type="number"
            step="0.25"
            value={form.commission}
            onChange={(e) => onChange({ commission: e.target.value })}
            placeholder="3"
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Payment</span>
          <Seg<SvcPayment>
            value={form.payment}
            onChange={(v) => onChange({ payment: v })}
            options={[
              { key: "cash", label: "Cash" },
              { key: "gcash", label: "GCash" },
            ]}
          />
        </div>
        <button
          onClick={onSubmit}
          disabled={!(parseFloat(form.amount) > 0)}
          className="btn-press inline-flex items-center gap-2 rounded-lg bg-mango px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-pine-deep transition enabled:hover:bg-mango-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconCheck className="h-4 w-4" /> Record {meta.label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}
