import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "سياسة التبديل | YURIVA" };

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "سياسة التبديل" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-6">سياسة التبديل والإرجاع</h1>
      <div className="space-y-5 text-sm text-brand-gray leading-relaxed">
        <p className="text-brand-navy font-bold">نحن فـ YURIVA حارصين على رضاك الكامل. إلا ما عجبكش المنتج، هاذي سياستنا:</p>
        <div className="bg-brand-light p-4">
          <h2 className="font-bold text-brand-navy mb-2">حالات التبديل المقبولة:</h2>
          <ul className="space-y-1.5">
            <li>• مشكل فالقياس (مختلف على المذكور)</li>
            <li>• عيب في المنتج أو الخياطة</li>
            <li>• وصل منتج مختلف على اللي طلبتي</li>
          </ul>
        </div>
        <div className="bg-brand-light p-4">
          <h2 className="font-bold text-brand-navy mb-2">شروط التبديل:</h2>
          <ul className="space-y-1.5">
            <li>• خلال 7 أيام من تاريخ الاستلام</li>
            <li>• المنتج في حالته الأصلية — ما لبسوهش وما غسلوهش</li>
            <li>• مع الغلاف والتيكيت إلا كانو موجودين</li>
          </ul>
        </div>
        <div className="bg-brand-light p-4">
          <h2 className="font-bold text-brand-navy mb-2">كيفاش تبدا التبديل:</h2>
          <p>راسلنا فواتساب وعطينا رقم الطلب وصورة المنتج. غادي نردو عليك خلال 24 ساعة.</p>
        </div>
        <p className="text-xs text-brand-gray">ملاحظة: المنتجات المباعة بعروض خاصة ممكن تخضع لشروط مختلفة. تواصل معنا لأي استفسار.</p>
      </div>
    </div>
  );
}
