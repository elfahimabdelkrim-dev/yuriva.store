import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/meta-capi-test
 * Sends a real (but clearly-labelled debug) Purchase event to Meta CAPI.
 * Uses testEventCode if present so it shows in Test Events and NOT in real data.
 * Safe: never exposes token, pixel ID, or any secret in the response.
 */
export async function GET(req: NextRequest) {
  const pixelId     = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  const accessToken = process.env.META_ACCESS_TOKEN ?? null;
  const testCode    = process.env.META_TEST_EVENT_CODE ?? null;

  if (!pixelId || !accessToken) {
    return NextResponse.json({
      hasPixelId:       !!pixelId,
      hasCAPIToken:     !!accessToken,
      hasTestEventCode: !!testCode,
      error: "Missing NEXT_PUBLIC_META_PIXEL_ID or META_ACCESS_TOKEN in env",
    }, { status: 400 });
  }

  const eventId  = `debug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const eventTime = Math.floor(Date.now() / 1000);
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || "https://yuriva.store";

  const clientIp  = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                 || req.headers.get("x-real-ip")
                 || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  const userData: Record<string, string> = {};
  if (clientIp)  userData.client_ip_address  = clientIp;
  if (userAgent) userData.client_user_agent   = userAgent;

  const eventPayload = {
    event_name: "Purchase",
    event_time: eventTime,
    event_id:   eventId,
    action_source: "website",
    event_source_url: siteUrl,
    user_data: userData,
    custom_data: {
      currency:      "MAD",
      value:         1,
      content_ids:   ["debug-test"],
      content_name:  "Debug Test Purchase",
      content_type:  "product",
      num_items:     1,
      order_id:      `debug-${Date.now()}`,
    },
  };

  const requestBody: Record<string, unknown> = {
    data:         [eventPayload],
    access_token: accessToken,
  };

  // Debug endpoint deliberately uses testEventCode so it shows in Test Events
  // and does NOT pollute real purchase stats
  if (testCode) requestBody.test_event_code = testCode;

  try {
    const { GRAPH_API_VERSION } = await import("@/lib/meta-capi");
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`;

    const resp     = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(requestBody),
    });

    let respJson: {
      events_received?: number;
      messages?:        string[];
      fbtrace_id?:      string;
      error?: { message?: string; code?: number };
    } = {};

    try { respJson = await resp.json() as typeof respJson; } catch { /* ignore */ }

    const eventsReceived = respJson.events_received ?? 0;
    const safeError = respJson.error?.message
      ?.replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"[REDACTED]"')
      .slice(0, 200);

    return NextResponse.json({
      hasPixelId:       true,
      pixelIdLast4:     pixelId.slice(-4),
      hasCAPIToken:     true,
      hasTestEventCode: !!testCode,
      eventId,
      metaStatus:       resp.status,
      events_received:  eventsReceived,
      messages:         respJson.messages ?? [],
      fbtrace_id:       respJson.fbtrace_id ?? null,
      accepted:         resp.ok && eventsReceived >= 1,
      error:            safeError ?? null,
    });
  } catch (err) {
    return NextResponse.json({
      hasPixelId:   true,
      hasCAPIToken: true,
      error:        String(err).replace(/access_token=[^&\s]*/gi, "access_token=[REDACTED]").slice(0, 200),
    }, { status: 500 });
  }
}
