import type { WhatsAppOrderData } from "@/types";
import { siteConfig } from "@/config/site";

export function buildWhatsAppOrderMessage(data: WhatsAppOrderData): string {
  const orderLines = data.items
    .map((item) => {
      let colorsText = "";
      if (item.is_pack && item.pack_colors && item.pack_colors.length > 0) {
        colorsText = item.pack_colors
          .map((pc) => `قطعة ${pc.pieceIndex + 1}: ${pc.color.label}`)
          .join("، ");
      } else if (item.color) {
        colorsText = item.color.label;
      }
      return `  • ${item.product_title}
    القياس: ${item.size}
    اللون: ${colorsText || "غير محدد"}
    الكمية: ${item.quantity}
    الثمن: ${item.price * item.quantity} درهم`;
    })
    .join("\n\n");

  const deliveryText =
    data.delivery_price === 0 ? "مجاني 🎁" : `${data.delivery_price} درهم`;

  return `🛍️ *طلب جديد من YURIVA*

👤 *الاسم:* ${data.customer_name}
📞 *الهاتف:* ${data.phone}
🏙️ *المدينة:* ${data.city}
📍 *العنوان:* ${data.address}

📦 *المنتجات:*
${orderLines}

🚚 *التوصيل:* ${deliveryText}
💰 *المجموع الكلي:* ${data.total + data.delivery_price} درهم
💳 *طريقة الدفع:* الدفع عند الاستلام

${data.notes ? `📝 *ملاحظات:* ${data.notes}` : ""}
${data.order_id ? `🔖 *رقم الطلب:* #${data.order_id}` : ""}

_تم الطلب من موقع yuriva.ma_`;
}

export function buildWhatsAppURL(
  message: string,
  number?: string
): string {
  const phone = number || siteConfig.whatsappNumber;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

export function buildOrderWhatsAppURL(data: WhatsAppOrderData, number?: string): string {
  const message = buildWhatsAppOrderMessage(data);
  return buildWhatsAppURL(message, number);
}

// Quick action templates for admin
export function buildQuickWhatsAppURL(
  template: string,
  variables: Record<string, string>,
  phone: string,
  waNumber?: string
): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  const recipientPhone = phone.startsWith("+") ? phone.slice(1) : phone;
  return `https://wa.me/${recipientPhone}?text=${encodeURIComponent(message)}`;
}
