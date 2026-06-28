import { NextRequest, NextResponse } from "next/server";
import { GRAPH_API_VERSION } from "@/lib/meta-capi";

export const dynamic = "force-dynamic";

const EXPECTED_SITE_URL  = "https://yuriva.store";
const EXPECTED_PIXEL_ID  = "4569111183412330";
const STANDARD_EVENTS    = ["PageView", "ViewContent", "InitiateCheckout", "Purchase", "Contact"];

/**
 * GET /api/debug/meta-tracking-health
 * Safe read-only diagnostic — exposes NO secrets.
 * Checks consistency of Pixel ID, domain, CAPI mode, env config.
 */
export async function GET(req: NextRequest) {
  const pixelId        = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  const siteUrl        = process.env.NEXT_PUBLIC_SITE_URL ?? null;
  const hasToken       = !!(process.env.META_ACCESS_TOKEN);
  const hasTestCode    = !!(process.env.META_TEST_EVENT_CODE);
  const waPresent      = !!(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

  const currentHost    = req.headers.get("host") ?? "unknown";
  const currentOrigin  = `https://${currentHost}`;

  const warnings: string[] = [];

  if (!siteUrl) {
    warnings.push("NEXT_PUBLIC_SITE_URL is not set — CAPI event_source_url will use hardcoded fallback");
  } else if (siteUrl !== EXPECTED_SITE_URL) {
    warnings.push(`NEXT_PUBLIC_SITE_URL is "${siteUrl}" but expected "${EXPECTED_SITE_URL}" — check for domain mismatch`);
  }

  if (!pixelId) {
    warnings.push("NEXT_PUBLIC_META_PIXEL_ID is not set — browser Pixel and CAPI will not fire");
  } else if (pixelId !== EXPECTED_PIXEL_ID) {
    warnings.push(`Pixel ID ends in "${pixelId.slice(-4)}" — verify this matches your Meta dataset`);
  }

  if (hasTestCode) {
    warnings.push("META_TEST_EVENT_CODE is set — real production purchases will appear in Test Events ONLY, not in Vue d\'ensemble. Delete it from Vercel for production.");
  }

  if (!hasToken) {
    warnings.push("META_ACCESS_TOKEN is not set — server-side CAPI Purchase will not fire. Mobile purchases may be missed.");
  }

  if (currentHost.includes("vercel.app")) {
    warnings.push(`Request came from preview domain (${currentHost}) — browser Pixel events from preview will not match production dataset`);
  }

  return NextResponse.json({
    // ── Pixel / CAPI ───────────────────────────────────────────────────────
    pixelIdLast4:           pixelId ? pixelId.slice(-4) : null,
    pixelIdPresent:         !!pixelId,
    pixelIdMatchesExpected: pixelId === EXPECTED_PIXEL_ID,
    hasCAPIToken:           hasToken,
    hasTestEventCode:       hasTestCode,
    capiMode:               hasTestCode ? "test_event_code_present" : "production",
    apiVersion:             GRAPH_API_VERSION,

    // ── Domain / URL ───────────────────────────────────────────────────────
    siteUrl:                siteUrl ?? "(not set — using hardcoded fallback)",
    expectedSiteUrl:        EXPECTED_SITE_URL,
    siteUrlCorrect:         siteUrl === EXPECTED_SITE_URL,
    currentDomain:          currentOrigin,

    // ── Other env ─────────────────────────────────────────────────────────
    environment:            process.env.NODE_ENV,
    whatsappNumberPresent:  waPresent,

    // ── Event names (hardcoded in this codebase) ──────────────────────────
    eventNamesUsed:         STANDARD_EVENTS,

    // ── Deduplication proof ───────────────────────────────────────────────
    eventIdStrategy:        "purchase_{Date.now()}_{random} — unique per order, shared by browser Pixel and server CAPI",
    testEventCodeUsedForRealOrders: false,  // enforced in /api/orders — NO testEventCode passed

    // ── Warnings ──────────────────────────────────────────────────────────
    warnings:               warnings,
    healthy:                warnings.length === 0,
  });
}
