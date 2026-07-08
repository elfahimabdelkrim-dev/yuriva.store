// lib/whatsapp-notify.ts — SERVER-SIDE ONLY
// Sends admin WhatsApp notifications when new orders are placed.
// Never import in client components. Never expose API tokens to the frontend.

import type { Order, OrderItem } from "@/types";

export const WA_API_VERSION = "v20.0";

export interface WaNotifyResult {
  ok: boolean;
  provider?: string;
  message_id?: string;
  error?: string;
}

// ── Arabic/Darija message builder ────────────────────────────────────────────

export function buildAdminMessage(order: Order & { id: string }, items: OrderItem[]): string {
  const fullName = [order.customer_first_name, order.customer_last_name]
    .filter(Boolean).join(" ").trim() || "—";

  let itemsBlock: string;
  if (items.length === 0) {
    itemsBlock = "—";
  } else if (items.length === 1) {
    const it = items[0];
    let colors = "—";
    try { colors = (JSON.parse(it.colors || "[]") as string[]).join(", ") || "—"; } catch { colors = it.colors || "—"; }
    itemsBlock =
      `المنتج: ${it.product_title}\n` +
      `القياس: ${it.size || "—"} | اللون: ${colors} | الكمية: ${it.quantity}`;
  } else {
    itemsBlock = items.map((it, i) => {
      let colors = "—";
      try { colors = (JSON.parse(it.colors || "[]") as string[]).join(", ") || "—"; } catch { colors = it.colors || "—"; }
      return `القطعة ${i + 1}: ${it.product_title} — اللون: ${colors} — القياس: ${it.size || "—"}`;
    }).join("\n");
  }

  return (
    `طلب جديد من متجر YURIVA ✅\n\n` +
    `معلومات الزبون:\n` +
    `الاسم: ${fullName}\n` +
    `الهاتف: ${order.phone}\n` +
    `المدينة: ${order.city || "—"}\n` +
    `العنوان: ${order.address || "—"}\n` +
    (order.notes ? `الملاحظات: ${order.notes}\n` : "") +
    `\nتفاصيل الطلب:\n${itemsBlock}\n\n` +
    `الثمن:\n` +
    `المجموع: ${order.total_amount} درهم\n` +
    `التوصيل: مجاني\n` +
    `الدفع: عند الاستلام\n\n` +
    `رقم الطلب: ${order.id}\n\n` +
    `ملاحظة: خاص الاتصال بالزبون لتأكيد الطلب قبل الإرسال.`
  );
}

// ── Provider: WhatsApp Cloud API (Meta) ──────────────────────────────────────

async function sendViaCloudApi(
  to: string,
  order: Order & { id: string },
  items: OrderItem[]
): Promise<WaNotifyResult> {
  const token         = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      ok: false, provider: "cloud_api",
      error: "Missing WHATSAPP_CLOUD_API_TOKEN or WHATSAPP_CLOUD_PHONE_NUMBER_ID",
    };
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}/messages`;

  //
  // WhatsApp Cloud API business-initiated messages require approved templates.
  // Set WHATSAPP_USE_TEXT=true only for test numbers registered in your
  // WhatsApp Business developer sandbox (bypasses template requirement).
  //
  const useText    = process.env.WHATSAPP_USE_TEXT === "true";
  const tmplName   = process.env.WHATSAPP_TEMPLATE_NAME || "order_notification_admin";
  const tmplLang   = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar";

  let payload: Record<string, unknown>;

  if (useText) {
    // Free-form text — works only within 24h customer-service window or sandbox numbers
    const body = buildAdminMessage(order, items);
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body, preview_url: false },
    };
  } else {
    // Template message — requires an approved template in WhatsApp Business Manager.
    // The template must have a {{body}} component with 3 parameters:
    //   {{1}} = order id   {{2}} = customer name   {{3}} = total
    const customerName = [order.customer_first_name, order.customer_last_name]
      .filter(Boolean).join(" ") || order.phone;
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: tmplName,
        language: { code: tmplLang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(order.id) },
              { type: "text", text: customerName },
              { type: "text", text: `${order.total_amount} درهم` },
            ],
          },
        ],
      },
    };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let json: Record<string, unknown> = {};
  try { json = await resp.json() as Record<string, unknown>; } catch { /* ignore */ }

  if (!resp.ok) {
    type ErrShape = { error?: { message?: string } };
    const errMsg = (json as ErrShape).error?.message ?? `HTTP ${resp.status}`;
    return { ok: false, provider: "cloud_api", error: errMsg.slice(0, 300) };
  }

  type OkShape = { messages?: Array<{ id?: string }> };
  const messageId = (json as OkShape).messages?.[0]?.id;
  return { ok: true, provider: "cloud_api", message_id: messageId };
}

// ── Provider: Webhook (Make / n8n / Zapier / custom) ─────────────────────────

async function sendViaWebhook(
  to: string,
  order: Order & { id: string },
  items: OrderItem[]
): Promise<WaNotifyResult> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  const secret     = process.env.WHATSAPP_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return { ok: false, provider: "webhook", error: "Missing WHATSAPP_WEBHOOK_URL" };
  }

  const fullName = [order.customer_first_name, order.customer_last_name]
    .filter(Boolean).join(" ").trim();

  const message = buildAdminMessage(order, items);

  const body = {
    to,
    message,
    order: {
      id: order.id,
      customer_name: fullName,
      phone: order.phone,
      city: order.city,
      address: order.address,
      notes: order.notes ?? null,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at ?? null,
    },
    items: items.map((it) => {
      let colors: string[] = [];
      try { colors = JSON.parse(it.colors || "[]") as string[]; } catch { colors = []; }
      return {
        product_title: it.product_title,
        quantity: it.quantity,
        size: it.size,
        colors,
        total: it.total,
      };
    }),
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Webhook-Secret"] = secret;

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    return { ok: false, provider: "webhook", error: `HTTP ${resp.status}` };
  }

  return { ok: true, provider: "webhook" };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp order notification to the admin phone number.
 * Safe: errors are caught and returned; never throws.
 * If WHATSAPP_NOTIFY_ENABLED != "true", skips silently.
 */
export async function sendWhatsAppOrderNotification(
  order: Order & { id: string },
  items: OrderItem[]
): Promise<WaNotifyResult> {
  const enabled = process.env.WHATSAPP_NOTIFY_ENABLED === "true";

  if (!enabled) {
    // Not an error — just disabled
    return { ok: false, error: "disabled" };
  }

  const adminPhone = (process.env.WHATSAPP_ADMIN_PHONE || "212666648564").replace(/\D/g, "");
  const provider   = (process.env.WHATSAPP_PROVIDER || "cloud_api").toLowerCase().trim();

  console.log(
    "[WA Notify] Starting",
    "order=" + order.id,
    "provider=" + provider,
    "to=" + adminPhone
  );

  try {
    let result: WaNotifyResult;

    if (provider === "webhook") {
      result = await sendViaWebhook(adminPhone, order, items);
    } else {
      result = await sendViaCloudApi(adminPhone, order, items);
    }

    if (result.ok) {
      console.log(
        "[WA Notify] Sent OK",
        "order=" + order.id,
        "provider=" + result.provider,
        result.message_id ? "msg_id=" + result.message_id : ""
      );
    } else {
      console.warn(
        "[WA Notify] Failed",
        "order=" + order.id,
        "error=" + result.error
      );
    }

    return result;
  } catch (err: unknown) {
    const msg = String(err).slice(0, 300);
    console.error("[WA Notify] Unexpected error", "order=" + order.id, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Returns current configuration status (no secrets exposed).
 * Safe to call from admin API routes.
 */
export function getWaNotifyStatus(): {
  enabled: boolean;
  provider: string;
  adminPhone: string;
  configured: boolean;
} {
  const enabled    = process.env.WHATSAPP_NOTIFY_ENABLED === "true";
  const provider   = (process.env.WHATSAPP_PROVIDER || "cloud_api").toLowerCase().trim();
  const adminPhone = process.env.WHATSAPP_ADMIN_PHONE || "212666648564";

  const configured =
    provider === "webhook"
      ? !!(process.env.WHATSAPP_WEBHOOK_URL)
      : !!(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);

  return { enabled, provider, adminPhone, configured };
}
