import { NextResponse } from "next/server";

/**
 * GET /api/admin/google-sheets/debug
 *
 * Safe server-side debug endpoint — returns only boolean flags and non-sensitive
 * metadata. Never returns actual secret values.
 *
 * Supported env var names:
 *   GOOGLE_PRIVATE_KEY
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  (also accepts GOOGLE_CLIENT_EMAIL)
 *   GOOGLE_SHEET_ID
 */
export async function GET() {
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const serviceEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || "";
  const sheetId = process.env.GOOGLE_SHEET_ID ?? "";

  // Normalize key to check format (never returned to client)
  const normalizedKey = privateKeyRaw.replace(/\\n/g, "\n").replace(/^["'\s]+|["'\s]+$/g, "");

  return NextResponse.json(
    {
      hasPrivateKey: privateKeyRaw.length > 0,
      hasServiceEmail: serviceEmail.length > 0,
      hasSheetId: sheetId.length > 0,

      // Non-secret debug info
      privateKeyLength: privateKeyRaw.length,
      privateKeyValid: normalizedKey.includes("-----BEGIN"),
      privateKeyEnvName: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        ? "GOOGLE_SERVICE_ACCOUNT_EMAIL"
        : process.env.GOOGLE_CLIENT_EMAIL
        ? "GOOGLE_CLIENT_EMAIL (legacy)"
        : "not set",
      serviceEmailDomain: serviceEmail.includes("@")
        ? serviceEmail.split("@")[1]
        : null,
      sheetIdLength: sheetId.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
