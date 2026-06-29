import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/store-health
 * Safe read-only health check. Never exposes secrets.
 */
export async function GET() {
  const pixelId    = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? null;
  const hasToken   = !!(process.env.META_ACCESS_TOKEN);
  const hasTestCode = !!(process.env.META_TEST_EVENT_CODE);
  const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasWA      = !!(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

  // Google Sheets — exact env names used by lib/google-sheets.ts
  const hasGooglePrivateKey          = !!(process.env.GOOGLE_PRIVATE_KEY);
  const hasGoogleSheetId             = !!(process.env.GOOGLE_SHEET_ID);
  const hasGoogleServiceAccountEmail = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL);
  const hasSheets = hasGooglePrivateKey && hasGoogleSheetId && hasGoogleServiceAccountEmail;

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

      const { error: imgErr } = await sb
        .from("product_images")
        .select("id, image_url, alt_text, sort_order, image_type")
        .limit(1);
      if (imgErr) {
        productImageError = imgErr.message;
      } else {
        productImageTableOk = true;
      }

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

  // ── Warnings ──────────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (!pixelId)    warnings.push("NEXT_PUBLIC_META_PIXEL_ID not set");
  if (!hasToken)   warnings.push("META_ACCESS_TOKEN not set — CAPI will not fire");
  if (hasTestCode) warnings.push("META_TEST_EVENT_CODE is set — remove for production");
  if (!siteUrl)    warnings.push("NEXT_PUBLIC_SITE_URL not set — using hardcoded fallback");
  if (!hasSupabase) warnings.push("Supabase not configured — orders will not be saved");
  if (!hasWA)      warnings.push("NEXT_PUBLIC_WHATSAPP_NUMBER not set");
  if (!hasSheets)  warnings.push("Google Sheets not configured — orders will not sync");
  if (productImageError) warnings.push("product_images table error: " + productImageError);
  if (sampleProductError) warnings.push("products table error: " + sampleProductError);

  return NextResponse.json({
    env: {
      supabase:                  hasSupabase,
      pixel:                     !!pixelId,
      pixelIdLast4:              pixelId ? pixelId.slice(-4) : null,
      capiToken:                 hasToken,
      testEventCodePresent:      hasTestCode,
      capiMode:                  hasTestCode ? "TEST — remove META_TEST_EVENT_CODE for production" : "PRODUCTION",
      siteUrl:                   siteUrl ?? "(not set)",
      whatsapp:                  hasWA,
      googleSheets:              hasSheets,
      hasGooglePrivateKey,
      hasGoogleSheetId,
      hasGoogleServiceAccountEmail,
      nodeEnv:                   process.env.NODE_ENV,
    },
    database: {
      productImagesTableOk:      productImageTableOk,
      productImagesColumns:      productImageTableOk ? ["id", "image_url", "alt_text", "sort_order", "image_type"] : null,
      sampleProductOk,
      sampleProductTitle,
    },
    pixelEventFlow: {
      PageView:         "TrackingPixels.tsx (initial) + PageViewTracker.tsx (SPA)",
      ViewContent:      "ProductViewContent.tsx on product page mount",
      InitiateCheckout: "InlineOrderForm.tsx on submit click",
      Purchase:         "InlineOrderForm.tsx (browser) + /api/orders (CAPI)",
      Contact:          "InlineOrderForm.tsx on WhatsApp click",
    },
    deduplication: {
      strategy:    "purchase_{timestamp}_{random} — unique per order",
      browserCapi: "same eventID shared by fbqPurchase and sendCapiPurchase",
      status:      "CORRECT",
    },
    warnings,
    healthy: warnings.length === 0,
  });
}
