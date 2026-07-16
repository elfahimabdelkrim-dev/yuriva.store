import { NextResponse } from "next/server";
import type { Order, OrderItem } from "@/types";

export const dynamic = "force-dynamic";

// Simple admin auth check — checks ADMIN_SECRET header or query param.
// Matches the existing admin protection pattern in this project.
function isAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return true; // No secret configured — allow (dev mode)
  const header = req.headers.get("x-admin-secret");
  const url    = new URL(req.url);
  const param  = url.searchParams.get("secret");
  return header === secret || param === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Build a synthetic test order
  const now        = new Date().toISOString();
  const testOrder: Order & { id: string } = {
    id:                   "TEST-" + Date.now(),
    customer_first_name:  "اختبار",
    customer_last_name:   "واتساب",
    phone:                "0666000000",
    city:                 "الدار البيضاء",
    address:              "شارع محمد الخامس رقم 1",
    notes:                "هذه رسالة اختبار من لوحة الإدارة",
    total_amount:         199,
    delivery_price:       0,
    payment_method:       "cod",
    status:               "جديد",
    created_at:           now,
  };

  const testItems: OrderItem[] = [
    {
      product_id:    "test-prod-001",
      product_title: "سروال Para Premium",
      product_price: 199,
      quantity:      1,
      size:          "L",
      colors:        JSON.stringify(["أزرق داكن"]),
      total:         199,
    },
  ];

  try {
    const { sendWhatsAppOrderNotification, getWaNotifyStatus } = await import("@/lib/whatsapp-notify");
    const status = getWaNotifyStatus();

    if (!status.enabled) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp notifications are disabled. Set WHATSAPP_NOTIFY_ENABLED=true in .env.local",
        config: status,
      });
    }

    if (!status.configured) {
      return NextResponse.json({
        success: false,
        error: `Provider '${status.provider}' is not configured. Check your .env.local credentials.`,
        config: status,
      });
    }

    console.log("[WA Notify Test] Sending test message to", status.adminPhone);

    const result = await sendWhatsAppOrderNotification(testOrder, testItems);

    return NextResponse.json({
      success: result.ok,
      result,
      config: status,
      test_order_id: testOrder.id,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err).slice(0, 300) },
      { status: 500 }
    );
  }
}
