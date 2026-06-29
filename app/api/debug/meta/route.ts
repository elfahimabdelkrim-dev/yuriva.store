import { NextResponse } from "next/server";
import { GRAPH_API_VERSION } from "@/lib/meta-capi";

export const dynamic = "force-dynamic";

export async function GET() {
  const pixelId         = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  const hasTestCode     = !!(process.env.META_TEST_EVENT_CODE);

  return NextResponse.json({
    hasPixelId:        !!pixelId,
    pixelIdLast4:      pixelId ? pixelId.slice(-4) : null,
    hasCAPIToken:      !!(process.env.META_ACCESS_TOKEN),
    hasTestEventCode:  hasTestCode,
    siteUrl:           process.env.NEXT_PUBLIC_SITE_URL ?? null,
    nodeEnv:           process.env.NODE_ENV,
    apiVersion:        GRAPH_API_VERSION,
    capiMode:          hasTestCode ? "test_event_code_present" : "production",

    // Advanced Matching configuration status
    advancedMatching: {
      browser: {
        configured: true,
        description: "fbqAdvancedMatch() re-calls fbq(init) with ph/fn/ln/country before Purchase",
        fields: ["ph (raw — Meta hashes)", "fn (raw lowercase)", "ln (raw lowercase)", "country: ma"],
      },
      capi: {
        configured: true,
        description: "sendCapiPurchase() hashes fn/ln/country server-side via SHA-256",
        fields: ["ph (SHA-256 normalized +212)", "fn (SHA-256 lowercase)", "ln (SHA-256 lowercase)", "ct (SHA-256)", "country (SHA-256 of 'ma')", "client_ip_address", "client_user_agent", "fbp", "fbc"],
      },
    },

    // Deduplication strategy
    deduplication: {
      browserUsesEventIDFourthArg: true,
      serverUsesEventId: true,
      purchaseFiresOnce: true,
      sessionStorageGuard: "purchase_fired_{eventId}",
      strategy: "purchase_{timestamp}_{random} — unique per order submission",
      note: "Same purchaseEventId shared by fbqPurchase({ eventID }) and CAPI event_id",
    },

    // Event fire order
    eventFlow: {
      "1_submit_click":      "purchaseEventId generated",
      "2_initiate_checkout": "fbqInitiateCheckout fires (browser)",
      "3_api_call":          "POST /api/orders",
      "4_capi_purchase":     "sendCapiPurchase fires (server, awaited)",
      "5_api_returns":       "order_id received",
      "6_advanced_match":    "fbqAdvancedMatch fires (browser — updates user signals)",
      "7_browser_purchase":  "fbqPurchase fires (browser, eventID=purchaseEventId)",
      "8_mark_fired":        "markPurchaseFired(purchaseEventId) in sessionStorage",
      "9_redirect":          "router.push(/thank-you)",
    },
  });
}
