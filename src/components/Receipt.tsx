import { useState } from "react";
import { fmtDayFull, fmtTime, peso, peso0, type Sale } from "../lib/data";
import { useStore } from "../lib/store";
import { PayBadge } from "./ui";
import { IconCopy, IconPrint, IconSend } from "./Icons";

/**
 * On-screen + printable receipt for a completed Sale. Header comes from
 * settings.receipt (falls back to the store profile name). Print isolates
 * this component via the `.receipt` class + the @media print rules in
 * index.css. Share uses the Web Share API where available, otherwise falls
 * back to copying a plain-text summary to the clipboard.
 */
export default function Receipt({ sale }: { sale: Sale }) {
  const { db, settings } = useStore();
  const [copied, setCopied] = useState(false);

  const r = settings.receipt ?? {};
  const storeName = r.storeName?.trim() || settings.storeName;
  const customer = sale.customerId ? db.customers.find((c) => c.id === sale.customerId) : undefined;
  const itemCount = sale.items.reduce((s, it) => s + it.qty, 0);

  const shareText = [
    storeName,
    r.address,
    r.contact,
    "--------------------------------",
    `${fmtDayFull(sale.ts)}, ${fmtTime(sale.ts)}`,
    `Receipt #${sale.id}`,
    "--------------------------------",
    ...sale.items.map((it) => `${it.name} x${it.qty}  ${peso(it.qty * it.price)}`),
    "--------------------------------",
    `TOTAL: ${peso(sale.total)}`,
    `Payment: ${sale.payment === "gcash" ? "GCash" : sale.payment === "utang" ? "Utang" : "Cash"}`,
    customer ? `Suki: ${customer.name}` : "",
    r.footer ? "" : "",
    r.footer,
  ]
    .filter((l) => l !== undefined && l !== "")
    .join("\n");

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Resibo · ${storeName}`, text: shareText });
      } catch {
        /* user cancelled the share sheet — nothing to do */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable — silently no-op */
    }
  };

  return (
    <div>
      <div className="receipt mx-auto w-full max-w-xs rounded-lg border border-dashed border-line bg-card p-5 font-mono text-xs leading-relaxed text-ink">
        <div className="text-center">
          <p className="font-display text-base font-extrabold">{storeName}</p>
          {r.address && <p className="text-[11px] text-ink-soft">{r.address}</p>}
          {r.contact && <p className="text-[11px] text-ink-soft">{r.contact}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-line" />

        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>{fmtDayFull(sale.ts)}</span>
          <span>{fmtTime(sale.ts)}</span>
        </div>
        <p className="text-[11px] text-ink-soft">Receipt #{sale.id}</p>
        {customer && <p className="text-[11px] text-ink-soft">Suki: {customer.name}</p>}

        <div className="my-3 border-t border-dashed border-line" />

        <div className="space-y-1.5">
          {sale.items.map((it, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1">
                {it.name}
                <span className="text-ink-soft"> ×{it.qty}</span>
              </span>
              <span className="tnum shrink-0 font-semibold">{peso0(it.qty * it.price)}</span>
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-line" />

        <div className="flex items-center justify-between text-sm font-extrabold">
          <span>TOTAL</span>
          <span className="tnum">{peso(sale.total)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-soft">
          <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
          <PayBadge p={sale.payment} size="sm" />
        </div>

        {r.footer && (
          <>
            <div className="my-3 border-t border-dashed border-line" />
            <p className="text-center text-[11px] italic text-ink-soft">{r.footer}</p>
          </>
        )}

        <p className="mt-3 text-center text-[10px] text-ink-soft/70">Powered by TindahanPro</p>
      </div>

      <div className="receipt-actions mt-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="btn-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-pine px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-mango transition hover:bg-pine-deep"
        >
          <IconPrint className="h-4 w-4" /> Print
        </button>
        <button
          onClick={handleShare}
          className="btn-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink transition hover:border-pine hover:bg-pine-soft"
        >
          {copied ? (
            <>
              <IconCopy className="h-4 w-4" /> Copied!
            </>
          ) : typeof navigator.share === "function" ? (
            <>
              <IconSend className="h-4 w-4" /> Share
            </>
          ) : (
            <>
              <IconCopy className="h-4 w-4" /> Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
