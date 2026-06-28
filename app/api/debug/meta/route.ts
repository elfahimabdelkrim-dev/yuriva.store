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
    // "test_event_code_present" means real orders WON'T appear in Vue d'ensemble
    // Remove META_TEST_EVENT_CODE from Vercel for production purchases to show normally
    capiMode:          hasTestCode ? "test_event_code_present" : "production",
  });
}
