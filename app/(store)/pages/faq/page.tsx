import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";
import FAQSection from "@/components/home/FAQSection";
import { staticFAQs } from "@/data/settings";
import { JsonLdFAQ } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة | YURIVA",
  description: "إجابات على أكثر الأسئلة المطروحة حول YURIVA — التوصيل، الدفع، التبديل، القياسات وغيرها.",
};

export default function FAQPage() {
  return (
    <>
      <JsonLdFAQ faqs={staticFAQs} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: "الأسئلة الشائعة" }]} className="mb-5" />
        <h1 className="text-3xl font-black text-brand-navy mb-2">الأسئلة الشائعة</h1>
        <p className="text-brand-gray text-sm mb-8">إجابات على كل أسئلتك حول YURIVA</p>
        <FAQSection faqs={staticFAQs} title="" />
      </div>
    </>
  );
}
