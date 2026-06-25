import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "التوصيل والتبديل | YURIVA" };

export default function DeliveryExchangePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "التوصيل والتبديل" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-6">التوصيل والتبديل</h1>
      <div className="space-y-6">
        <div className="bg-brand-light p-5">
          <h2 className="font-black text-brand-navy text-lg mb-3">🚚 التوصيل</h2>
          <ul className="space-y-2 text-sm text-brand-gray">
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>التوصيل مجاني لجميع مدن المغرب بدون استثناء</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>مدة التوصيل: 24 إلى 72 ساعة حسب المدينة</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>المدن الكبرى (كازا، رباط، فاس، مراكش): 24-48 ساعة</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>باقي المدن: 48-72 ساعة</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>غادي نتاصلو بيك فواتساب قبل الإرسال للتأكيد</li>
          </ul>
        </div>
        <div className="bg-brand-light p-5">
          <h2 className="font-black text-brand-navy text-lg mb-3">💵 الدفع</h2>
          <ul className="space-y-2 text-sm text-brand-gray">
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>الدفع عند الاستلام فقط — ما كاين حتى دفع مسبق</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>خلص الدليفري ملي توصلك السلعة — بسيطة</li>
          </ul>
        </div>
        <div className="bg-brand-light p-5">
          <h2 className="font-black text-brand-navy text-lg mb-3">🔄 التبديل</h2>
          <ul className="space-y-2 text-sm text-brand-gray">
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>التبديل ممكن خلال 7 أيام من تاريخ الاستلام</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>يجي فقط في حالة مشكل فالقياس أو عيب في المنتج</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>المنتج خاصو يكون في حالته الأصلية (ما يكونش لبسوه)</li>
            <li className="flex gap-2"><span className="text-brand-gold">✓</span>راسلنا فواتساب لبدء عملية التبديل</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
