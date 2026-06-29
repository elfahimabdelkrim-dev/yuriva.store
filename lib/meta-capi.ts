// lib/meta-capi.ts — SERVER-SIDE ONLY
// Meta Conversions API (CAPI) — Purchase event sender.
// Never import in client components. Never log or return the access token.

import crypto from "crypto";

export const GRAPH_API_VERSION = "v21.0";

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Normalise a Moroccan phone number for CAPI hashing.
 * Meta expects: digits only, with country code, no leading +.
 *   "0612345678"    → "212612345678"
 *   "+212612345678" → "212612345678"
 *   "212612345678"  → "212612345678"
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("212") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "212" + digits.slice(1);
  return digits;
}

function hashPhone(raw: string): string | null {
  const normalized = normalizePhone(raw.trim());
  if (!normalized || normalized.length < 9) return null;
  return sha256(normalized);
}

function hashCity(city: string): string {
  return sha256(city.toLowerCase().replace(/\s+/g, "").trim());
}

/**
 * Hash a name field for CAPI Advanced Matching.
 * Meta spec: lowercase, strip leading/trailing whitespace, no special handling.
 * Do NOT log the raw name value.
 */
function hashName(name: string): string {
  return sha256(name.toLowerCase().trim());
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CapiPurchaseParams {
  pixelId: string;
  accessToken: string;
  /** Only pass for debug/test endpoint — NEVER for real production orders */
  testEventCode?: string;

  eventId: string;
  orderId: string;
  value: number;
  productId: string;
  productTitle: string;
  numItems: number;

  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}

export interface CapiResult {
  ok: boolean;
  eventsReceived?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: string;
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function sendCapiPurchase(params: CapiPurchaseParams): Promise<CapiResult> {
  const {
    pixelId, accessToken, testEventCode,
    eventId, orderId, value, productId, productTitle, numItems,
    phone, firstName, lastName, city, clientIp, userAgent, fbp, fbc, eventSourceUrl,
  } = params;

  // event_time must be Unix seconds, not milliseconds
  const eventTime = Math.floor(Date.now() / 1000);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yuriva.store";

  // Build user_data — hash all PII, pass matching signals in clear
  const userData: Record<string, string> = {};

  // Phone (hashed)
  if (phone) {
    const hashed = hashPhone(phone);
    if (hashed) userData.ph = hashed;
  }

  // Name (hashed) — fn = first name, ln = last name (Meta CAPI spec)
  if (firstName) userData.fn = hashName(firstName);
  if (lastName)  userData.ln = hashName(lastName);

  // City (hashed)
  if (city) userData.ct = hashCity(city);

  // Country — Morocco. Always include for better matching.
  userData.country = sha256("ma");

  // Client signals (clear — not PII)
  if (clientIp)  userData.client_ip_address  = clientIp;
  if (userAgent) userData.client_user_agent  = userAgent;
  if (fbp)       userData.fbp = fbp;
  if (fbc)       userData.fbc = fbc;

  // Log user_data quality (never log raw values)
  console.log(
    "[Meta CAPI] user_data quality",
    "has_ph="       + !!userData.ph,
    "has_fn="       + !!userData.fn,
    "has_ln="       + !!userData.ln,
    "has_ct="       + !!userData.ct,
    "has_country="  + !!userData.country,
    "has_fbp="      + !!userData.fbp,
    "has_fbc="      + !!userData.fbc,
    "has_ip="       + !!userData.client_ip_address,
    "has_ua="       + !!userData.client_user_agent
  );

  const eventPayload: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: eventTime,
    event_id: eventId,
    action_source: "website",
    event_source_url: eventSourceUrl || siteUrl,
    user_data: userData,
    custom_data: {
      currency: "MAD",
      value,
      content_ids: [productId],
      content_name: productTitle,
      content_type: "product",
      num_items: numItems,
      order_id: orderId,
    },
  };

  const requestBody: Record<string, unknown> = {
    data: [eventPayload],
    access_token: accessToken,
  };

  // test_event_code routes events to Test Events ONLY — never include for real orders
  if (testEventCode) {
    requestBody.test_event_code = testEventCode;
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    // Always parse Meta's JSON response — HTTP 200 does NOT mean event was accepted
    let respJson: {
      events_received?: number;
      messages?: string[];
      fbtrace_id?: string;
      error?: { message?: string; type?: string; code?: number };
    } = {};
    try {
      respJson = await resp.json() as typeof respJson;
    } catch {
      return { ok: false, error: `HTTP ${resp.status}: failed to parse Meta response JSON` };
    }

    const eventsReceived = respJson.events_received ?? 0;
    const messages       = respJson.messages;
    const fbtrace_id     = respJson.fbtrace_id;

    if (!resp.ok) {
      const safeMsg = (respJson.error?.message ?? "unknown")
        .replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"[REDACTED]"')
        .slice(0, 300);
      return {
        ok: false,
        eventsReceived,
        messages,
        fbtrace_id,
        error: `HTTP ${resp.status}: ${safeMsg}`,
      };
    }

    if (eventsReceived === 0) {
      // HTTP 200 but Meta rejected the event
      const safeMsg = messages?.join("; ").slice(0, 300) ?? "events_received=0";
      return {
        ok: false,
        eventsReceived,
        messages,
        fbtrace_id,
        error: safeMsg,
      };
    }

    return { ok: true, eventsReceived, messages, fbtrace_id };

  } catch (err: unknown) {
    const msg = String(err)
      .replace(/access_token=[^&\s]*/gi, "access_token=[REDACTED]")
      .slice(0, 200);
    return { ok: false, error: msg };
  }
}
