// Google Sheets sync — server-side only, NEVER expose credentials to client
//
// Root-cause fix for "shifted to the right":
//   The old code used sheets.spreadsheets.values.append() whose "table detection"
//   algorithm can mis-identify the insertion column when the sheet has a mix of
//   14-column legacy rows and new 25-column headers.
//   Fix: read column A to find the next empty row, then write with values.update()
//   to an explicit range like 'Feuille 1'!A35:Y35 — always starts from column A.
//
// Supported env vars:
//   GOOGLE_PRIVATE_KEY            — required (service account PEM key)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  — required (also accepts GOOGLE_CLIENT_EMAIL)
//   GOOGLE_SHEET_ID               — required (spreadsheet ID from URL)

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

/**
 * Convert a 1-based column number to an A1-notation letter.
 * Supports up to 702 columns (A–ZZ).
 * Examples: 1 → "A", 14 → "N", 25 → "Y", 27 → "AA"
 */
export function columnToLetter(n: number): string {
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

// ── Sheet headers (25 columns — A through Y) ─────────────────────────────
// Cols 1–14  (A–N): core order data — MUST stay in this exact order
// Cols 15–25 (O–Y): attribution + tracking fields

const HEADERS = [
  // Core order data (A–N)
  "رقم الطلب",      // A
  "التاريخ",              // B
  "الاسم الكامل",  // C
  "الهاتف",                    // D
  "المدينة",              // E
  "العنوان",              // F
  "المنتج",                    // G
  "المقاس",                    // H
  "الألوان",              // I
  "الكمية",                    // J
  "المجموع",              // K
  "الحالة",                    // L
  "ملاحظة",                    // M
  "المصدر",                    // N
  // Attribution + tracking (O–Y)
  "purchase_event_id",                                       // O
  "pixel_status",                                            // P
  "capi_status",                                             // Q
  "google_sheet_synced",                                     // R
  "fbclid",                                                  // S
  "fbp",                                                     // T
  "fbc",                                                     // U
  "utm_source",                                              // V
  "utm_campaign",                                            // W
  "landing_page",                                            // X
  "referrer",                                                // Y
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

  const headerB64  = toBase64Url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
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

export function cleanSheetId(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return "";

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];

  if (/^[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    const half = trimmed.length / 2;
    if (trimmed.slice(0, half) === trimmed.slice(half)) return trimmed.slice(0, half);
  }

  return trimmed;
}

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
  const rawKey        = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const normalizedKey = rawKey ? normalizePrivateKey(rawKey) : "";
  const rawSheetId    = process.env.GOOGLE_SHEET_ID ?? "";
  const cleanedSheetId = cleanSheetId(rawSheetId);
  return {
    hasPrivateKey:    rawKey.length > 0,
    hasServiceEmail:  !!(getServiceEmail()),
    hasSheetId:       rawSheetId.length > 0,
    privateKeyLength: rawKey.length,
    privateKeyValid:  normalizedKey.includes("-----BEGIN"),
    sheetIdLength:    rawSheetId.length,
    sheetIdCleaned:   cleanedSheetId,
    sheetIdWarning:   sheetIdWarning(cleanedSheetId),
  };
}

// ── Internal builder ───────────────────────────────────────────────────────

interface SyncConfig {
  sheetId?: string;
  serviceEmail?: string;
}

type SheetsClient = any; // eslint-disable-line

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

/**
 * Always write the current HEADERS to row 1 (A1:Y1).
 * Uses values.update — does NOT insert rows, so no data is ever shifted.
 * This safely upgrades old 14-column headers to the current 25-column schema.
 */
async function ensureHeaders(
  sheets: SheetsClient,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  const lastCol = columnToLetter(HEADERS.length);
  const range   = `${quoteSheet(sheetTitle)}!A1:${lastCol}1`;
  console.log(`[Google Sheets] headers length: ${HEADERS.length}`);
  console.log(`[Google Sheets] header range: ${range}`);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
  console.log(`[Google Sheets] headers written (${HEADERS.length} columns)`);
}

/**
 * Read column A and return:
 *   nextRow     — 1-based index of the first empty row (after all data)
 *   existingIds — all values found in column A (order IDs + header)
 *
 * This is the anchor for the write range: 'Sheet'!A{nextRow}:Y{nextRow}
 */
async function getNextEmptyRow(
  sheets: SheetsClient,
  spreadsheetId: string,
  sheetTitle: string
): Promise<{ nextRow: number; existingIds: string[] }> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheet(sheetTitle)}!A:A`,
  });
  const values = (response.data?.values as string[][] | undefined) || [];
  // Each element is a row; length = last row index with data in col A
  const existingIds = values.map((r) => (r[0] ?? "").trim());
  return {
    nextRow:     values.length + 1,   // next empty row (1-indexed)
    existingIds,
  };
}

// ── Test connection ────────────────────────────────────────────────────────

export interface TestResult {
  ok: boolean;
  error?: string;
  sheetTitle?: string;
  diagnostics: {
    authConfigured:     boolean;
    tokenFetchAttempted: boolean;
    spreadsheetAccess:  boolean;
    writeAccess:        boolean;
  };
}

export async function testConnection(config?: SyncConfig): Promise<TestResult> {
  const diag = {
    authConfigured:      false,
    tokenFetchAttempted: false,
    spreadsheetAccess:   false,
    writeAccess:         false,
  };

  try {
    diag.authConfigured      = true;
    diag.tokenFetchAttempted = true;

    const { sheets, sheetId } = await getAuthAndSheets(config);

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

    // ── Find next empty row by reading column A ────────────────────────────
    // This replaces the old append() call which could mis-detect the table
    // boundary and insert starting from the wrong column (e.g. column N/O).
    stage = "get_next_row";
    const { nextRow, existingIds } = await getNextEmptyRow(sheets, sheetId, sheetTitle);
    console.log(`[Google Sheets] next empty row: ${nextRow}`);

    // Dedup: skip if this order_id is already in column A
    if (order.id && existingIds.includes(order.id)) {
      console.log(`[Google Sheets] order ${order.id} already synced, skipping`);
      return { ok: true };
    }

    // ── Build the 25-column row ──────────────────────────────────────────────
    const itemsTitle = order.items?.map((i) => i.product_title).filter(Boolean).join(", ") || "";
    const sizes      = order.items?.map((i) => i.size).filter(Boolean).join(", ") || "";
    const totalQty   = order.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 1;
    const fullName   = `${order.customer_first_name ?? ""} ${order.customer_last_name ?? ""}`.trim();

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

    // Row values MUST match HEADERS exactly (same count and same order)
    const row: string[] = [
      // Cols A–N: core order data
      order.id          ?? "",
      new Date(order.created_at || Date.now()).toLocaleString("ar-MA"),
      fullName,
      order.phone       ?? "",
      order.city        ?? "",
      order.address     ?? "",
      itemsTitle,
      sizes,
      colorsStr,
      String(totalQty),
      String(order.total_amount ?? 0),
      order.status      ?? "new",
      order.notes       ?? "",
      order.source      ?? "direct",
      // Cols O–Y: attribution + tracking
      order.purchase_event_id ?? "",
      order.pixel_status      ?? "pending",
      order.capi_status       ?? "",
      String(order.google_sheet_synced ?? true),
      order.fbclid            ?? "",
      order.fbp               ?? "",
      order.fbc               ?? "",
      order.utm_source        ?? "",
      order.utm_campaign      ?? "",
      order.landing_page      ?? "",
      order.referrer          ?? "",
    ];

    // Pad / trim to exactly HEADERS.length values
    const paddedRow = Array.from({ length: HEADERS.length }, (_, i) => row[i] ?? "");

    // ── Write to explicit range starting from column A ─────────────────────
    // e.g. 'Feuille 1'!A35:Y35 — guarantees data starts at column A
    stage = "write_row";
    const lastCol    = columnToLetter(HEADERS.length);
    const writeRange = `${quoteSheet(sheetTitle)}!A${nextRow}:${lastCol}${nextRow}`;
    console.log(`[Google Sheets] row length: ${paddedRow.length}`);
    console.log(`[Google Sheets] write range: ${writeRange}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range:         writeRange,
      valueInputOption: "USER_ENTERED",
      requestBody:   { values: [paddedRow] },
    });
    console.log(`[Google Sheets] append success order_id=${order.id}`);

    return { ok: true };
  } catch (err: unknown) {
    const msg = String(err);
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

    const range    = `${quoteSheet(sheetTitle)}!A:A`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const rows     = (response.data.values as string[][] | undefined) || [];
    const rowIndex = rows.findIndex((r) => r[0] === orderId);
    if (rowIndex === -1) return false;

    // Status is column L (12th column, index 11) in the 25-column schema
    const statusCol = columnToLetter(12); // "L"
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range:         `${quoteSheet(sheetTitle)}!${statusCol}${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody:   { values: [[status]] },
    });
    return true;
  } catch (err) {
    console.error("[Google Sheets] updateOrderStatusInSheet error:", err);
    return false;
  }
}

// ── Detect shifted rows ────────────────────────────────────────────────────
// A "shifted" row is a data row (not header) where column A is empty
// but some other column has data — this means the order was written
// starting from the wrong column (e.g. N or O instead of A).

export interface ShiftedRowInfo {
  row:          number;   // 1-based sheet row number
  firstDataCol: string;   // e.g. "N" or "O"
  firstValue:   string;   // the value in firstDataCol (usually the order ID)
}

export async function detectShiftedRows(config?: SyncConfig): Promise<{
  ok: boolean;
  sheetTitle?: string;
  shiftedRows: ShiftedRowInfo[];
  error?: string;
}> {
  try {
    const { sheets, sheetId } = await getAuthAndSheets(config);
    const sheetTitle = await getFirstSheetTitle(sheets, sheetId);

    // Read enough columns to catch any shift (up to column AZ = 52)
    const wideLastCol = columnToLetter(52);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${quoteSheet(sheetTitle)}!A:${wideLastCol}`,
    });
    const allRows = (response.data?.values as string[][] | undefined) || [];

    const shiftedRows: ShiftedRowInfo[] = [];

    allRows.forEach((row, idx) => {
      const rowNum = idx + 1;
      if (rowNum === 1) return; // skip header row

      const colA = (row[0] ?? "").trim();
      if (colA) return; // col A has data → correctly placed

      // Find first non-empty column
      const firstDataIdx = row.findIndex((c) => c && c.trim());
      if (firstDataIdx > 0) {
        shiftedRows.push({
          row:          rowNum,
          firstDataCol: columnToLetter(firstDataIdx + 1),
          firstValue:   row[firstDataIdx],
        });
      }
    });

    return { ok: true, sheetTitle, shiftedRows };
  } catch (err) {
    return {
      ok: false,
      shiftedRows: [],
      error: String(err).replace(/BEGIN[\s\S]*?END[^-]*PRIVATE[^-]*KEY[^-]*/gi, "[REDACTED]").slice(0, 300),
    };
  }
}

// ── Repair shifted rows ────────────────────────────────────────────────────
// For each shifted row: reads the data from the wrong columns,
// extracts 25 values starting from firstDataIdx, writes to A{row}:Y{row},
// then clears the old columns (if they extended beyond Y).

export async function repairShiftedRows(config?: SyncConfig): Promise<{
  ok: boolean;
  repaired: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let repaired = 0;
  let skipped  = 0;

  try {
    const { sheets, sheetId } = await getAuthAndSheets(config);
    const sheetTitle = await getFirstSheetTitle(sheets, sheetId);

    const wideLastCol = columnToLetter(52);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${quoteSheet(sheetTitle)}!A:${wideLastCol}`,
    });
    const allRows = (response.data?.values as string[][] | undefined) || [];

    for (let idx = 0; idx < allRows.length; idx++) {
      const row    = allRows[idx];
      const rowNum = idx + 1;
      if (rowNum === 1) continue;

      const colA = (row[0] ?? "").trim();
      if (colA) continue; // already in correct position

      const firstDataIdx = row.findIndex((c) => c && c.trim());
      if (firstDataIdx <= 0) continue; // completely empty row

      // Extract 25 values from the shifted position
      const extracted = Array.from({ length: HEADERS.length }, (_, i) =>
        row[firstDataIdx + i] ?? ""
      );

      // Clear the entire row first (A through AZ)
      const clearRange = `${quoteSheet(sheetTitle)}!A${rowNum}:${wideLastCol}${rowNum}`;
      await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: clearRange });

      // Write extracted data starting from column A
      const lastCol    = columnToLetter(HEADERS.length);
      const writeRange = `${quoteSheet(sheetTitle)}!A${rowNum}:${lastCol}${rowNum}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range:         writeRange,
        valueInputOption: "USER_ENTERED",
        requestBody:   { values: [extracted] },
      });

      console.log(`[Google Sheets] repaired row ${rowNum}: was at col ${columnToLetter(firstDataIdx + 1)} → moved to A`);
      repaired++;
    }
  } catch (err) {
    errors.push(String(err).slice(0, 200));
  }

  return { ok: errors.length === 0, repaired, skipped, errors };
}
