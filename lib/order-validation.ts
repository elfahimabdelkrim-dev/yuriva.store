// lib/order-validation.ts
// SINGLE SOURCE OF TRUTH for order classification and eligibility.
//
// These functions are the ONLY place where "valid order", "WhatsApp lead",
// "test order" and "Meta Purchase eligible" are defined. They are used by:
//   - /api/orders            (order creation: sheet sync + CAPI gating)
//   - /api/orders/pixel-status (browser Pixel Purchase gating)
//   - /api/admin/reconcile   (reconciliation dry-run + selective sync)
//   - admin dashboard statistics
// Do NOT copy this logic into other files - import from here.

import type { Order } from "@/types";
import { validateMoroccanPhone } from "@/lib/utils";

// Cancelled statuses in the store status vocabulary
const CANCELLED_STATUSES = new Set(["ملغي", "رفض الطلب", "رجع"]);

export type OrderCategory =
  | "real_cod"        // valid COD order from the website checkout
  | "whatsapp_lead"   // WhatsApp lead - NOT a purchase
  | "test"            // test order (source/test markers)
  | "admin"           // created manually by admin
  | "cancelled"       // real order but cancelled/refused/returned
  | "invalid";        // missing/invalid phone or name - not operational

/** Normalize an order ID to the permanent string dedup key. */
export function normalizeOrderId(id: unknown): string {
  return String(id ?? "").trim();
}

function sourceOf(order: Order): string {
  return String(order.source ?? "direct").toLowerCase().trim();
}

export function isTestOrder(order: Order): boolean {
  const src  = sourceOf(order);
  const name = `${order.customer_first_name ?? ""} ${order.customer_last_name ?? ""}`.toLowerCase();
  return (
    src === "test" ||
    src.startsWith("test") ||
    name.includes("test") ||
    name.includes("تجربة")
  );
}

export function isWhatsAppLead(order: Order): boolean {
  return sourceOf(order).startsWith("whatsapp");
}

export function isAdminCreated(order: Order): boolean {
  const src = sourceOf(order);
  return src === "admin" || src.startsWith("admin");
}

export function isCancelled(order: Order): boolean {
  return CANCELLED_STATUSES.has(String(order.status ?? ""));
}

export function hasValidCustomer(order: Order): boolean {
  const name  = `${order.customer_first_name ?? ""} ${order.customer_last_name ?? ""}`.trim();
  const phone = String(order.phone ?? "").trim();
  return name.length >= 2 && phone.length > 0 && validateMoroccanPhone(phone);
}

/**
 * Operational order = belongs in the dashboard AND in the Google Sheet.
 *   - successfully saved (has a database ID)
 *   - not a test order
 *   - has a valid customer name + Moroccan phone
 * Cancelled orders remain operational (they are real order history -
 * their status column shows the cancellation).
 */
export function isValidOperationalOrder(order: Order): boolean {
  return (
    !!normalizeOrderId(order.id) &&
    !isTestOrder(order) &&
    hasValidCustomer(order)
  );
}

/**
 * Meta Purchase eligible = exactly the orders that may fire ONE Purchase
 * (browser eventID + CAPI event_id = purchase_<database_order_id>).
 *   - valid operational order
 *   - created through the completed website COD checkout
 *   - NOT whatsapp_direct (leads may fire Lead: lead_<id> - never Purchase)
 *   - NOT test, NOT admin-created
 * Historical backfills / reconciliation must NEVER call Meta for these.
 */
export function isMetaPurchaseEligible(order: Order): boolean {
  return (
    isValidOperationalOrder(order) &&
    !isWhatsAppLead(order) &&
    !isAdminCreated(order)
  );
}

/** Classify an order into exactly one reporting category. */
export function classifyOrder(order: Order): OrderCategory {
  if (isTestOrder(order))            return "test";
  if (!hasValidCustomer(order))      return "invalid";
  if (isWhatsAppLead(order))         return "whatsapp_lead";
  if (isAdminCreated(order))         return "admin";
  if (isCancelled(order))            return "cancelled";
  return "real_cod";
}

/** Human-readable reason why an order is (or is not) safe to sync/track. */
export function classificationReason(order: Order): string {
  const cat = classifyOrder(order);
  switch (cat) {
    case "test":          return "طلب تجريبي (test)";
    case "invalid":       return "بيانات ناقصة — الاسم أو الهاتف غير صالح";
    case "whatsapp_lead": return "WhatsApp lead — يظهر في الورقة لكن ليس Purchase";
    case "admin":         return "أنشئ يدوياً من لوحة التحكم";
    case "cancelled":     return "طلب حقيقي لكن ملغي/مرفوض/مرجع";
    case "real_cod":      return "طلب COD حقيقي من الموقع";
  }
}
