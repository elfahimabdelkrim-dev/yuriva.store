// Google Sheets sync — server-side only, NEVER expose credentials to client
//
// Supported env vars:
//   GOOGLE_PRIVATE_KEY            — required (service account PEM key)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  — required (also accepts GOOGLE_CLIENT_EMAIL)
//   GOOGLE_SHEET_ID               — required (spreadsheet ID from URL)
//
// Root-cause fix: gtoken (used internally by googleapis JWT auth) hardcodes
// the deprecated https://www.googleapis.com/oauth2/v4/token endpoint, which
// causes "Premature close" errors. We bypass gtoken entirely:
//   1. Sign the JWT ourselves with Node's built-in crypto module
//   2. Exchange for a token at the correct https://oauth2.googleapis.com/token
//   3. Set the token directly on an OAuth2Client — no gtoken involved

import crypto from "crypto";
import type { Order } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Base64url encode a Buffer (safe for TS — avoids "base64url" encoding name) */
function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Normalize a raw private key from env */
function normalizePrivateKey(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")              // JSON-escaped newlines → real newlines
    .replace(/^["'\s]+|["'\s]+$/g, ""); // Strip surrounding quotes / whitespace
}

/** Returns GOOGLE_SERVICE_ACCOUNT_EMAIL or legacy GOOGLE_CLIENT_EMAIL */
function getServiceEmail(): string | undefined {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
}

// ── Retry helper ───────────────────────────────────────────────────────────

const RETRYABLE = ["Premature close", "ECONNRESET", "ETIMEDOUT", "fetch failed", "network"];

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err: unknown) {
      lastErr = err;
      const msg = String(err);
      const retryable = RETRYABLE.some((s) => msg.includes(s));
      if (!retryable || i === retries) throw err;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

// ── JWT → Access Token (bypasses gtoken/v4 endpoint) ──────────────────────

async function fetchGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", // correct (non-deprecated) endpoint
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = toBase64Url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payloadB64 = toBase64Url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput, "utf8");
  const signatureB64 = toBase64Url(sign.sign(privateKey));

  const assertion = `${signingInput}.${signatureB64}`;

  const resp = await fetchWithRetry("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    let parsed: { error?: string; error_description?: string } = {};
    try { parsed = JSON.parse(txt); } catch { /* ignore */ }
    const code = parsed.error || String(resp.status);
    const desc = parsed.error_description || txt;
    throw new Error(`google_token_error:${code}:${desc}`);
  }

  const data = await resp.json() as { access_token?: string };
  if (!data.access_token) throw new Error("google_token_error:empty_response:No access_token in response");
  return data.access_token;
}

// ── Public config helpers ──────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(process.env.GOOGLE_PRIVATE_KEY && getServiceEmail() && process.env.GOOGLE_SHEET_ID);
}

export function getConfigStatus() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const normalizedKey = rawKey ? normalizePrivateKey(rawKey) : "";
  return {
    hasPrivateKey: rawKey.length > 0,
    hasServiceEmail: !!(getServiceEmail()),
    hasSheetId: !!(process.env.GOOGLE_SHEET_ID),
    privateKeyLength: rawKey.length,
    privateKeyValid: normalizedKey.includes("-----BEGIN"),
  };
}

// ── Internal builder ───────────────────────────────────────────────────────

interface SyncConfig {
  sheetId?: string;
  serviceEmail?: string;
}

async function getAuthAndSheets(config?: SyncConfig) {
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  if (!privateKeyRaw) throw new Error("GOOGLE_PRIVATE_KEY missing");

  const email = config?.serviceEmail || getServiceEmail();
  if (!email) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL missing");

  const sheetId = config?.sheetId || process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID missing");

  const privateKey = normalizePrivateKey(privateKeyRaw);
  if (!privateKey.includes("-----BEGIN")) {
    throw new Error("GOOGLE_PRIVATE_KEY invalid format — missing -----BEGIN PRIVATE KEY-----");
  }

  // Fetch token via correct endpoint, bypassing gtoken entirely
  const accessToken = await fetchGoogleAccessToken(email, privateKey);

  const { google } = await import("googleapis");
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, sheetId };
}

// ── Test connection ────────────────────────────────────────────────────────

export interface TestResult {
  ok: boolean;
  error?: string;
  diagnostics: {
    authConfigured: boolean;
    tokenFetchAttempted: boolean;
    spreadsheetAccess: boolean;
  };
}

export async function testConnection(config?: SyncConfig): Promise<TestResult> {
  const diag = { authConfigured: false, tokenFetchAttempted: false, spreadsheetAccess: false };

  try {
    diag.authConfigured = true;
    diag.tokenFetchAttempted = true;

    const { sheets, sheetId } = await getAuthAndSheets(config);

    // Retry spreadsheet.get for transient network errors
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        diag.spreadsheetAccess = true;
        return { ok: true, diagnostics: diag };
      } catch (e: unknown) {
        const msg = String(e);
        const retryable = RETRYABLE.some((s) => msg.includes(s));
        if (retryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
    throw new Error("Max retries exceeded for spreadsheet.get");
  } catch (err: unknown) {
    const msg = String(err);

    if (msg.includes("google_token_error:invalid_grant") || msg.includes("google_token_error:unauthorized_client")) {
      return { ok: false, error: "GOOGLE_PRIVATE_KEY أو Email غلوط — راجع credentials ديالك", diagnostics: diag };
    }
    if (msg.includes("google_token_error:")) {
      const parts = msg.split(":");
      return { ok: false, error: "خطأ في المصادقة: " + (parts[2] || parts[1]), diagnostics: diag };
    }
    if (msg.includes("invalid format")) {
      return { ok: false, error: "صيغة GOOGLE_PRIVATE_KEY غلوطة — خاصو يبدأ بـ -----BEGIN PRIVATE KEY-----", diagnostics: diag };
    }
    if (msg.includes("404") || msg.includes("not found")) {
      return { ok: false, error: "Sheet ID غلوط أو ما موجودش", diagnostics: diag };
    }
    if (msg.includes("403") || msg.includes("PERMISSION_DENIED") || msg.includes("permission")) {
      return { ok: false, error: "Service Account ما عندهش صلاحية — شارك الـ Sheet مع: " + (getServiceEmail() ?? "service account"), diagnostics: diag };
    }
    if (RETRYABLE.some((s) => msg.includes(s))) {
      return { ok: false, error: "خطأ في الشبكة بعد عدة محاولات — جرب من جديد", diagnostics: diag };
    }
    return { ok: false, error: msg, diagnostics: diag };
  }
}

// ── Sync order ─────────────────────────────────────────────────────────────

export async function syncOrderToSheet(order: Order, config?: SyncConfig): Promise<boolean> {
  if (!isConfigured() && !config?.sheetId) return false;
  try {
    const { sheets, sheetId } = await getAuthAndSheets(config);
    const itemsSummary = order.items?.map((i) => `${i.product_title} (${i.quantity}x)`).join(", ") || "";
    const row = [
      order.id,
      new Date(order.created_at || Date.now()).toLocaleString("ar-MA"),
      order.customer_first_name,
      order.customer_last_name,
      order.phone,
      order.city,
      order.address,
      order.total_amount,
      order.status,
      itemsSummary,
      order.notes || "",
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Feuille1!A:K",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    return true;
  } catch (err) {
    console.error("[Google Sheets] sync error:", err);
    return false;
  }
}

// ── Update order status ────────────────────────────────────────────────────

export async function updateOrderStatusInSheet(orderId: string, status: string, config?: SyncConfig): Promise<boolean> {
  if (!isConfigured() && !config?.sheetId) return false;
  try {
    const { sheets, sheetId } = await getAuthAndSheets(config);
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "Feuille1!A:A" });
    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === orderId);
    if (rowIndex === -1) return false;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Feuille1!I${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[status]] },
    });
    return true;
  } catch (err) {
    console.error("[Google Sheets] update error:", err);
    return false;
  }
}
