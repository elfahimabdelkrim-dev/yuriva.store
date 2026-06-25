import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "شروط الاستخدام | YURIVA" };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "شروط الاستخدام" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-6">شروط الاستخدام</h1>
      <div className="space-y-4 text-sm text-brand-gray leading-relaxed">
        <p>باستخدام موقع YURIVA، تقبل الشروط التالية:</p>
        <h2 className="font-bold text-brand-navy">الطلبات</h2>
        <p>كل طلب تسجله هو التزام بالشراء بثمن التوصيل المجاني والدفع عند الاستلام. تأكيد الطلب يكون عبر واتساب.</p>
        <h2 className="font-bold text-brand-navy">الأسعار</h2>
        <p>الأسعار المعروضة شاملة للتوصيل. ما كاين حتى رسوم إضافية مخفية.</p>
        <h2 className="font-bold text-brand-navy">المنتجات</h2>
        <p>الصور على الموقع قد تختلف قليلاً عن المنتج الحقيقي بسبب إعدادات الشاشة. نحاولو دايما نكونو دقيقين في الوصف.</p>
        <h2 className="font-bold text-brand-navy">إلغاء الطلب</h2>
        <p>تقدر تلغي الطلب قبل الإرسال عبر مراسلتنا فواتساب مباشرة.</p>
        <h2 className="font-bold text-brand-navy">التعديلات</h2>
        <p>YURIVA تحتفظ بحق تعديل الشروط في أي وقت. الاستمرار فاستخدام الموقع يعني قبول الشروط الجديدة.</p>
        <p className="text-xs">آخر تحديث: {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
