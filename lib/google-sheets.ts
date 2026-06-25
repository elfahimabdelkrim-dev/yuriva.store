// Google Sheets sync — server-side only, NEVER expose credentials to client
// Requires: GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL, GOOGLE_SHEET_ID in .env

import type { Order } from "@/types";

function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_SHEET_ID
  );
}

export async function syncOrderToSheet(order: Order): Promise<boolean> {
  if (!isConfigured()) return false;

  try {
    const { google } = await import("googleapis");

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    const itemsSummary = order.items
      ?.map((i) => `${i.product_title} (${i.quantity}x)`)
      .join(", ") || "";

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

export async function updateOrderStatusInSheet(
  orderId: string,
  status: string
): Promise<boolean> {
  if (!isConfigured()) return false;

  try {
    const { google } = await import("googleapis");

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    // Find row by order ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Feuille1!A:A",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === orderId);
    if (rowIndex === -1) return false;

    // Update status in column I (index 8)
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
