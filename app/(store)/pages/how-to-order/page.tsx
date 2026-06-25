import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Link from "next/link";

export const metadata: Metadata = { title: "كيفاش تطلب؟ | YURIVA" };

const STEPS = [
  { n: "01", t: "اختار المنتج", d: "تصفح الكتالوج واختار السروال، الشورت أو الباك اللي عجبك" },
  { n: "02", t: "اختار القياس واللون", d: "اختار القياس المناسب ليك واللون اللي يعجبك. شوف دليل القياسات إلا كنتي محتار" },
  { n: "03", t: "أضف للسلة", d: "اضغط زيد للسلة وكمل التسوق أو روح مباشرة للتسجيل" },
  { n: "04", t: "عمر بياناتك", d: "دخل اسمك، رقم هاتفك، مدينتك والعنوان الكامل ديالك" },
  { n: "05", t: "تأكيد عبر واتساب", d: "غادي نتاصلو بيك فواتساب باش نأكدو الطلب — هاد الخطوة إجبارية قبل الإرسال" },
  { n: "06", t: "الدفع عند الاستلام", d: "ملي توصلك السلعة، خلص للدليفري — بسيطة!" },
];

export default function HowToOrderPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "كيفاش تطلب؟" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-2">كيفاش تطلب من YURIVA؟</h1>
      <p className="text-brand-gray mb-8">عملية سهلة ومضمونة — 6 خطوات فقط</p>
      <div className="space-y-4 mb-8">
        {STEPS.map((step) => (
          <div key={step.n} className="flex gap-4 bg-brand-light p-4">
            <span className="text-3xl font-black text-brand-gold flex-shrink-0 w-12">{step.n}</span>
            <div>
              <h2 className="font-black text-brand-navy mb-1">{step.t}</h2>
              <p className="text-brand-gray text-sm">{step.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-brand-navy text-white p-6 text-center">
        <p className="font-bold text-lg mb-3">جاهز تطلب؟</p>
        <Link href="/products" className="inline-block bg-brand-gold text-white font-bold px-8 py-3">
          تسوق دابا
        </Link>
      </div>
    </div>
  );
}
