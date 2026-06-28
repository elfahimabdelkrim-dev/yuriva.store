// Google Sheets sync — server-side only, NEVER expose credentials to client
//
// Supported env vars:
//   GOOGLE_PRIVATE_KEY            — required (service account PEM key)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  — required (also accepts GOOGLE_CLIENT_EMAIL)
//   GOOGLE_SHEET_ID               — required (spreadsheet ID from URL)
//
// Root-cause fix #1: gtoken hardcodes deprecated v4/token endpoint.
//   We bypass gtoken: sign JWT with Node crypto, exchange at the correct endpoint.
// Root-cause fix #2: hardcoded sheet name "Feuille1" fails when tab has a space.
//   We fetch the first sheet title dynamically and quote it properly.

import crypto from "crypto";
import type { Order } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function normalizePrivateKey(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/^["'\s]+|["'\s]+$/g, "");
}

function getServiceEmail(): string | undefined {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
}

/** Quote a sheet title for A1 notation — handles spaces and apostrophes */
function quoteSheet(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

// ── Sheet headers (13 columns) ─────────────────────────────────────────────

const HEADERS = [
  "رقم الطلب", "التاريخ", "الاسم الكامل", "الهاتف", "المدينة",
  "العنوان", "المنتج", "المقاس", "الألوان", "الكمية", "المجموع",
  "الحالة", "ملاحظة", "المصدر",
];

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

// ── JWT → Access Token ─────────────────────────────────────────────────────

async function fetchGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
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
  if (!data.access_token) throw new Error("google_token_error:empty_response:No access_token");
  return data.access_token;
}

// ── Sheet ID cleaner ──────────────────────────────────────────────────────

/**
 * Extract a clean Google Spreadsheet ID from whatever the user pasted:
 *   - Full URL: https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
 *   - Doubled ID: {ID}{ID}  (copy-paste accident)
 *   - Already clean: {ID}
 * The real ID is ~44 chars of [A-Za-z0-9_-].
 */
export function cleanSheetId(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return "";

  // Extract from a URL containing /spreadsheets/d/{ID}
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];

  // Pure ID chars only — detect accidental duplication (even length, first half = second half)
  if (/^[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    const half = trimmed.length / 2;
    if (trimmed.slice(0, half) === trimmed.slice(half)) return trimmed.slice(0, half);
  }

  return trimmed;
}

/** Return a human-readable warning if the (already-cleaned) ID looks wrong, else null */
export function sheetIdWarning(id: string): string | null {
  if (!id) return "فارغ";
  if (id.length < 20) return `قصير جداً (${id.length} حرف) — تحقق من القيمة`;
  if (id.length > 60) return `طويل جداً (${id.length} حرف) — ربما يحتوي على URL أو تكرار`;
  return null;
}

// ── Public config helpers ──────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(process.env.GOOGLE_PRIVATE_KEY && getServiceEmail() && process.env.GOOGLE_SHEET_ID);
}

export function getConfigStatus() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const normalizedKey = rawKey ? normalizePrivateKey(rawKey) : "";
  const rawSheetId = process.env.GOOGLE_SHEET_ID ?? "";
  const cleanedSheetId = cleanSheetId(rawSheetId);
  return {
    hasPrivateKey: rawKey.length > 0,
    hasServiceEmail: !!(getServiceEmail()),
    hasSheetId: rawSheetId.length > 0,
    privateKeyLength: rawKey.length,
    privateKeyValid: normalizedKey.includes("-----BEGIN"),
    sheetIdLength: rawSheetId.length,
    sheetIdCleaned: cleanedSheetId,
    sheetIdWarning: sheetIdWarning(cleanedSheetId),
  };
}

// ── Internal builder ───────────────────────────────────────────────────────

interface SyncConfig {
  sheetId?: string;
  serviceEmail?: string;
}

type SheetsClient = any;

async function getAuthAndSheets(config?: SyncConfig): Promise<{ sheets: SheetsClient; sheetId: string }> {
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  if (!privateKeyRaw) throw new Error("GOOGLE_PRIVATE_KEY missing");

  const email = config?.serviceEmail || getServiceEmail();
  if (!email) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL missing");

  const rawSheetId = config?.sheetId || process.env.GOOGLE_SHEET_ID || "";
  if (!rawSheetId) throw new Error("GOOGLE_SHEET_ID missing");
  const sheetId = cleanSheetId(rawSheetId);
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID missing after cleaning");

  const privateKey = normalizePrivateKey(privateKeyRaw);
  if (!privateKey.includes("-----BEGIN")) {
    throw new Error("GOOGLE_PRIVATE_KEY invalid format");
  }

  const accessToken = await fetchGoogleAccessToken(email, privateKey);

  const { google } = await import("googleapis");
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, sheetId };
}

/** Fetch the actual title of the first sheet tab */
async function getFirstSheetTitle(sheets: SheetsClient, spreadsheetId: string): Promise<string> {
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });
    const title = meta.data?.sheets?.[0]?.properties?.title as string | undefined;
    return title || "Sheet1";
  } catch {
    return "Sheet1";
  }
}

/** Ensure header row exists; writes if the sheet is empty */
async function ensureHeaders(
  sheets: SheetsClient,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  const range = `${quoteSheet(sheetTitle)}!A1:M1`;
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = existing.data?.values as string[][] | undefined;
  if (!rows || rows.length === 0 || !rows[0]?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
  }
}

// ── Test connection ────────────────────────────────────────────────────────

export interface TestResult {
  ok: boolean;
  error?: string;
  sheetTitle?: string;
  diagnostics: {
    authConfigured: boolean;
    tokenFetchAttempted: boolean;
    spreadsheetAccess: boolean;
    writeAccess: boolean;
  };
}

export async function testConnection(config?: SyncConfig): Promise<TestResult> {
  const diag = {
    authConfigured: false,
    tokenFetchAttempted: false,
    spreadsheetAccess: false,
    writeAccess: false,
  };

  try {
    diag.authConfigured = true;
    diag.tokenFetchAttempted = true;

    const { sheets, sheetId } = await getAuthAndSheets(config);

    // Read test — fetch spreadsheet metadata (also gives us the real sheet title)
    let sheetTitle = "Sheet1";
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      diag.spreadsheetAccess = true;
      sheetTitle = meta.data?.sheets?.[0]?.properties?.title || "Sheet1";
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
        return {
          ok: false,
          error: `Service Account has no read permission. Share the sheet with: ${getServiceEmail() ?? "service account"}`,
          diagnostics: diag,
        };
      }
      throw e;
    }

    // Write test — append a test row then clear it
    const testRange = `${quoteSheet(sheetTitle)}!A1`;
    try {
      const appendResp = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: testRange,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [["TEST", new Date().toISOString(), "YURIVA write test"]],
        },
      });
      // Clear the test row we just wrote
      const updatedRange = appendResp.data?.updates?.updatedRange as string | undefined;
      if (updatedRange) {
        await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: updatedRange });
      }
      diag.writeAccess = true;
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
        return {
          ok: false,
          error: `Service Account can read but cannot write. Share the sheet as Editor with: ${getServiceEmail() ?? "service account"}`,
          sheetTitle,
          diagnostics: diag,
        };
      }
      throw e;
    }

    return { ok: true, sheetTitle, diagnostics: diag };
  } catch (err: unknown) {
    const msg = String(err);

    if (msg.includes("google_token_error:invalid_grant") || msg.includes("unauthorized_client")) {
      return { ok: false, error: "GOOGLE_PRIVATE_KEY or Email is wrong — check your credentials", diagnostics: diag };
    }
    if (msg.includes("google_token_error:")) {
      const parts = msg.split(":");
      return { ok: false, error: "Auth error: " + (parts[2] || parts[1]), diagnostics: diag };
    }
    if (msg.includes("invalid format")) {
      return { ok: false, error: "GOOGLE_PRIVATE_KEY format invalid — must start with -----BEGIN PRIVATE KEY-----", diagnostics: diag };
    }
    if (msg.includes("404") || msg.includes("not found")) {
      return { ok: false, error: "GOOGLE_SHEET_ID is wrong or sheet not found", diagnostics: diag };
    }
    if (RETRYABLE.some((s) => msg.includes(s))) {
      return { ok: false, error: "Network error after retries — try again", diagnostics: diag };
    }
    return { ok: false, error: msg.slice(0, 300), diagnostics: diag };
  }
}

// ── Sync order ─────────────────────────────────────────────────────────────

export interface SyncResult {
  ok: boolean;
  error?: string;
  stage?: string;
}

export async function syncOrderToSheet(order: Order, config?: SyncConfig): Promise<SyncResult> {
  if (!isConfigured() && !config?.sheetId) {
    return { ok: false, error: "Google Sheets not configured", stage: "config_check" };
  }

  let stage = "init";
  try {
    stage = "auth";
    const { sheets, sheetId } = await getAuthAndSheets(config);

    stage = "get_sheet_title";
    const sheetTitle = await getFirstSheetTitle(sheets, sheetId);

    stage = "ensure_headers";
    await ensureHeaders(sheets, sheetId, sheetTitle);

    // Build the 13-column row
    const itemsTitle = order.items?.map((i) => i.product_title).filter(Boolean).join(", ") || "";
    const sizes = order.items?.map((i) => i.size).filter(Boolean).join(", ") || "";
    const totalQty = order.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 1;
    const fullName = `${order.customer_first_name ?? ""} ${order.customer_last_name ?? ""}`.trim();

    // Parse colors from the first item's JSON string
    const colorsStr = (() => {
      try {
        const raw = order.items?.[0]?.colors;
        if (!raw || raw === "[]") return "";
        const parsed = JSON.parse(raw) as Array<{ pieceIndex?: number; color?: { label?: string }; label?: string }>;
        return parsed
          .map((c, i) => {
            const label = c.color?.label ?? c.label ?? "";
            return parsed.length > 1 ? `${i + 1}: ${label}` : label;
          })
          .filter(Boolean)
          .join("، ");
      } catch { return ""; }
    })();

    const row = [
      order.id ?? "",
      new Date(order.created_at || Date.now()).toLocaleString("ar-MA"),
      fullName,
      order.phone ?? "",
      order.city ?? "",
      order.address ?? "",
      itemsTitle,
      sizes,
      colorsStr,
      String(totalQty),
      String(order.total_amount ?? 0),
      order.status ?? "new",
      order.notes ?? "",
      order.source ?? "direct",
    ];

    stage = "append_row";
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${quoteSheet(sheetTitle)}!A:N`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return { ok: true };
  } catch (err: unknown) {
    const msg = String(err);
    // Strip any potential secrets from the error message
    const safeMsg = msg
      .replace(/BEGIN[^-]*PRIVATE[^-]*KEY[^-]*-+[\s\S]*?-+END[^-]*PRIVATE[^-]*KEY[^-]*-+/gi, "[KEY_REDACTED]")
      .slice(0, 300);
    console.error(`[Google Sheets] syncOrderToSheet failed at stage=${stage} order=${order.id}:`, safeMsg);
    return { ok: false, error: safeMsg, stage };
  }
}

// ── Update order status in sheet ───────────────────────────────────────────

export async function updateOrderStatusInSheet(
  orderId: string,
  status: string,
  config?: SyncConfig
): Promise<boolean> {
  if (!isConfigured() && !config?.sheetId) return false;
  try {
    const { sheets, sheetId } = await getAuthAndSheets(config);
    const sheetTitle = await getFirstSheetTitle(sheets, sheetId);

    // Find the row with matching order ID in column A
    const range = `${quoteSheet(sheetTitle)}!A:A`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const rows = (response.data.values as string[][] | undefined) || [];
    const rowIndex = rows.findIndex((r) => r[0] === orderId);
    if (rowIndex === -1) return false;

    // Status is column K (11th column) in the 14-column schema
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${quoteSheet(sheetTitle)}!K${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[status]] },
    });
    return true;
  } catch (err) {
    console.error("[Google Sheets] updateOrderStatusInSheet error:", err);
    return false;
  }
}
