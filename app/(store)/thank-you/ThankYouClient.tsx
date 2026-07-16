"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { fbqPurchase, fbqAdvancedMatch, markPurchaseFired, isPurchaseFired } from "@/lib/meta-pixel";

export default function ThankYouClient() {
  const p = useSearchParams();

  const orderId   = p.get("order_id")   || "";
  const name      = p.get("name")       || "";
  const phone     = p.get("phone")      || "";
  const city      = p.get("city")       || "";
  const address   = p.get("address")    || "";
  const product   = p.get("product")    || "";
  const productId = p.get("product_id") || "";
  const size      = p.get("size")       || "";
  const colors    = p.get("colors")     || "";
  const qty       = parseInt(p.get("qty") || "1", 10) || 1;
  const total     = parseInt(p.get("total") || "0", 10);

  const hasData = !!(orderId || name || phone);

  // ── Meta Pixel: Purchase — fires ONCE per real COD order ──────────────────
  // Two layers of deduplication:
  //   1. localStorage (fast path) — blocks refresh / back-nav in same browser
  //   2. Backend claim via /api/orders/pixel-status — blocks other devices,
  //      incognito, cleared storage, shared links, and fake order IDs.
  // eventID = purchase_${orderId} matches the CAPI event_id from /api/orders,
  // so Meta deduplicates browser vs server events for the same order.
  useEffect(() => {
    if (!orderId) return;
    if (!total)  return;

    if (isPurchaseFired(orderId)) {
      console.log("[Meta Pixel] Purchase skipped (localStorage), already tracked:", orderId);
      return;
    }

    let cancelled = false;

    (async () => {
      // ── Backend idempotency claim ─────────────────────────────────────
      // should_fire=false → already fired before OR order does not exist.
      let shouldFire = true;
      try {
        const r = await fetch("/api/orders/pixel-status", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ order_id: orderId }),
        });
        const d = await r.json() as { success?: boolean; should_fire?: boolean };
        if (d && d.success === true) shouldFire = d.should_fire === true;
      } catch {
        // Network error — fall back to firing; localStorage still guards refresh
      }

      if (cancelled) return;

      if (!shouldFire) {
        markPurchaseFired(orderId);
        console.log("[META_PURCHASE_ALREADY_SENT] browser skip order_id=" + orderId);
        return;
      }

      if (phone && name) {
        const parts     = name.trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName  = parts.slice(1).join(" ") || firstName;
        try { fbqAdvancedMatch(phone, firstName, lastName); } catch { /* ignore */ }
      }

      const eventId = `purchase_${orderId}`;
      try {
        fbqPurchase(
          { id: productId || orderId, title: product || "\u0645\u0646\u062a\u062c YURIVA", price: total },
          orderId,
          total,
          qty,
          eventId
        );
        markPurchaseFired(orderId);
        console.log("[META_BROWSER_PURCHASE] order_id=" + orderId + " event_id=" + eventId);
      } catch { /* pixel not loaded — safe to ignore */ }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, total]);

  // ── No-data fallback (URL opened directly without query params) ──────────
  if (!hasData) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-3">\u0637\u0644\u0628\u0643 \u062a\u0633\u062c\u0644 \u0628\u0646\u062c\u0627\u062d \u2705</h1>
        <p className="text-brand-gray">\u0633\u064a\u062a\u0645 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064a\u0628\u0627\u064b \u0644\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0637\u0644\u0628.</p>
      </div>
    );
  }

  const rows = [
    { label: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628",     value: orderId ? `#${orderId}` : null },
    { label: "\u0627\u0644\u0627\u0633\u0645",         value: name    || null },
    { label: "\u0627\u0644\u0647\u0627\u062a\u0641",        value: phone   || null, ltr: true },
    { label: "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",       value: city    || null },
    { label: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",       value: address || null },
    { label: "\u0627\u0644\u0645\u0646\u062a\u062c",        value: product || null },
    { label: "\u0627\u0644\u0645\u0642\u0627\u0633",        value: size    || null },
    { label: "\u0627\u0644\u0623\u0644\u0648\u0627\u0646",       value: colors  || null },
    { label: "\u0627\u0644\u0643\u0645\u064a\u0629",        value: qty > 0 ? String(qty) : null },
    { label: "\u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0643\u0644\u064a", value: total ? formatPrice(total) : null, bold: true },
    { label: "\u0627\u0644\u062a\u0648\u0635\u064a\u0644",       value: "\u0645\u062c\u0627\u0646\u064a \ud83c\udf81" },
    { label: "\u0627\u0644\u062f\u0641\u0639",         value: "\u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645" },
  ].filter((r) => r.value);

  return (
    <div className="max-w-lg mx-auto px-4 py-12">

      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-2">\u0637\u0644\u0628\u0643 \u062a\u0633\u062c\u0644 \u0628\u0646\u062c\u0627\u062d \u2705</h1>
        <p className="text-brand-gray text-sm">\u0634\u0643\u0631\u0627\u064b \u0639\u0644\u0649 \u062b\u0642\u062a\u0643 \u0641\u064a\u0646\u0627</p>
      </div>

      {/* Order summary */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-brand-navy px-5 py-3">
          <h2 className="text-white font-black text-sm">\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-brand-gray text-sm">{row.label}</span>
              <span
                className={`text-sm ${row.bold ? "font-black text-brand-navy" : "font-semibold text-brand-navy"}`}
                dir={row.ltr ? "ltr" : undefined}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
