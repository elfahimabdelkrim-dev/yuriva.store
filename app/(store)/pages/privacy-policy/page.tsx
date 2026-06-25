import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "سياسة الخصوصية | YURIVA" };

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "سياسة الخصوصية" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-6">سياسة الخصوصية</h1>
      <div className="space-y-4 text-sm text-brand-gray leading-relaxed">
        <p>نحن فـ YURIVA نحترمو خصوصيتك ونلتزمو بحماية بياناتك الشخصية.</p>
        <h2 className="font-bold text-brand-navy">المعلومات اللي نجمعو</h2>
        <p>ملي تدير طلب، نجمعو: الاسم، رقم الهاتف، المدينة والعنوان — فقط لغرض توصيل الطلب.</p>
        <h2 className="font-bold text-brand-navy">كيفاش نستعملو بياناتك</h2>
        <ul className="space-y-1">
          <li>• معالجة وتوصيل الطلب</li>
          <li>• التواصل معك لتأكيد الطلب</li>
          <li>• تحسين خدماتنا</li>
        </ul>
        <h2 className="font-bold text-brand-navy">مشاركة البيانات</h2>
        <p>ما نشاركوش بياناتك مع أطراف ثالثة إلا ما كان ضروري لتوصيل الطلب (شركة التوصيل).</p>
        <h2 className="font-bold text-brand-navy">حذف البيانات</h2>
        <p>تقدر تطلب حذف بياناتك في أي وقت عبر مراسلتنا فواتساب.</p>
        <p className="text-xs">آخر تحديث: {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
