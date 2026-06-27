import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Safe diagnostic endpoint — exposes NO secrets.
 * GET /api/debug/meta
 */
export async function GET() {
  const pixelId  = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  const hasToken = !!(process.env.META_ACCESS_TOKEN);

  return NextResponse.json({
    hasPixelId:   !!pixelId,
    pixelIdLast4: pixelId ? pixelId.slice(-4) : null,
    hasCAPIToken: hasToken,
    siteUrl:      process.env.NEXT_PUBLIC_SITE_URL ?? null,
    nodeEnv:      process.env.NODE_ENV,
  });
}
