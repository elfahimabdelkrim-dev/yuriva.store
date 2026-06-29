import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/store-health
 * Safe read-only health check. Never exposes secrets.
 * Returns: env status, pixel, capi token, product_images reachable, sample product.
 */
export async function GET() {
  const pixelId    = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? null;
  const hasToken   = !!(process.env.META_ACCESS_TOKEN);
  const hasTestCode = !!(process.env.META_TEST_EVENT_CODE);
  const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasWA      = !!(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  const hasSheets  = !!(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

  // ── Supabase checks ───────────────────────────────────────────────────────
  let productImageTableOk = false;
  let productImageError: string | null = null;
  let sampleProductOk = false;
  let sampleProductTitle: string | null = null;
  let sampleProductError: string | null = null;

  if (hasSupabase) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const sb = createAdminClient();

      // Test product_images table (uses image_url column)
      const { error: imgErr } = await sb
        .from("product_images")
        .select("id, image_url, alt_text, sort_order, image_type")
        .limit(1);
      if (imgErr) {
        productImageError = imgErr.message;
      } else {
        productImageTableOk = true;
      }

      // Test product fetch
      const { data: prod, error: prodErr } = await sb
        .from("products")
        .select("id, title, slug, is_active")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (prodErr) {
        sampleProductError = prodErr.message;
      } else if (prod) {
        sampleProductOk = true;
        sampleProductTitle = String(prod.title ?? "");
      } else {
        sampleProductError = "no active products found";
      }
    } catch (e) {
      productImageError = String(e).slice(0, 200);
      sampleProductError = String(e).slice(0, 200);
    }
  }

  // ── Build response ─────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (!pixelId)    warnings.push("NEXT_PUBLIC_META_PIXEL_ID not set — Pixel will not fire");
  if (!hasToken)   warnings.push("META_ACCESS_TOKEN not set — CAPI will not fire");
  if (hasTestCode) warnings.push("META_TEST_EVENT_CODE is set — real orders go to Test Events only, NOT Vue d'ensemble. Remove for production.");
  if (!siteUrl)    warnings.push("NEXT_PUBLIC_SITE_URL not set — CAPI event_source_url uses hardcoded fallback");
  if (!hasSupabase) warnings.push("Supabase not configured — orders will not be saved");
  if (!hasWA)      warnings.push("NEXT_PUBLIC_WHATSAPP_NUMBER not set — WhatsApp button may use fallback");
  if (!hasSheets)  warnings.push("Google Sheets not configured — orders will not sync");
  if (productImageError) warnings.push("product_images table error: " + productImageError);
  if (sampleProductError) warnings.push("products table error: " + sampleProductError);

  return NextResponse.json({
    // ── Env ───────────────────────────────────────────────────────────────
    env: {
      supabase:            hasSupabase,
      pixel:               !!pixelId,
      pixelIdLast4:        pixelId ? pixelId.slice(-4) : null,
      capiToken:           hasToken,
      testEventCodePresent: hasTestCode,
      capiMode:            hasTestCode ? "TEST — remove META_TEST_EVENT_CODE for production" : "PRODUCTION",
      siteUrl:             siteUrl ?? "(not set)",
      whatsapp:            hasWA,
      googleSheets:        hasSheets,
      nodeEnv:             process.env.NODE_ENV,
    },

    // ── DB ────────────────────────────────────────────────────────────────
    database: {
      productImagesTableOk: productImageTableOk,
      productImagesColumns: productImageTableOk ? ["id", "image_url", "alt_text", "sort_order", "image_type"] : null,
      sampleProductOk,
      sampleProductTitle,
    },

    // ── Pixel event flow ──────────────────────────────────────────────────
    pixelEventFlow: {
      PageView:         "TrackingPixels.tsx (initial load) + PageViewTracker.tsx (SPA route changes)",
      ViewContent:      "ProductViewContent.tsx — fires on product page mount",
      InitiateCheckout: "InlineOrderForm.tsx — fires on اشتري الآن click",
      Purchase:         "InlineOrderForm.tsx (browser) + /api/orders (CAPI server-side)",
      Contact:          "InlineOrderForm.tsx — fires on WhatsApp click",
    },

    // ── Deduplication ─────────────────────────────────────────────────────
    deduplication: {
      strategy:     "Unique event_id per order (purchase_{timestamp}_{random})",
      browserPixel: "fbqPurchase(eventId) — same ID as CAPI",
      capiServer:   "/api/orders passes meta.event_id to sendCapiPurchase",
      status:       "CORRECT — browser and server share same eventID for Meta dedup",
    },

    // ── Warnings / health ─────────────────────────────────────────────────
    warnings,
    healthy: warnings.length === 0,
  });
}
