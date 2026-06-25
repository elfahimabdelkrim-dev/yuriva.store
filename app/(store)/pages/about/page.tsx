import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "من نحن | YURIVA" };

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "من نحن" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-6">من نحن</h1>
      <div className="prose prose-sm max-w-none space-y-4 text-brand-gray leading-relaxed">
        <p className="text-brand-navy font-bold text-lg">YURIVA — ماركة مغربية 100% مخصصة للملابس الرجالية العملية.</p>
        <p>بدأنا YURIVA بهدف واحد: نوفرو لكل رجل مغربي سراول وشورتات عملية بجودة عالمية وبثمن معقول. آمنا بلي الرجل المغربي يستحق أحسن من اللي موجود فالسوق.</p>
        <p>تخصصنا فسراول Para، Shorts Para، Cargo Pants وباكات — منتجات اخترناها بعناية لتكون مريحة للاستعمال اليومي: الخروج، الخدمة، الرياضة، وحتى المناسبات.</p>
        <div className="bg-brand-light p-5 rounded-sm">
          <h2 className="font-black text-brand-navy mb-3">قيمنا</h2>
          <ul className="space-y-2">
            {["الجودة أولاً — كل منتج نبيعوه مررنا بيه بأنفسنا", "التوصيل مجاني — ما كاين حتى مفاجآت فالثمن", "الدفع عند الاستلام — ثقتنا فيك قبل ثقتك فينا", "خدمة الزبون — واتساب دايما مفتوح لأي سؤال"].map(v => (
              <li key={v} className="flex items-start gap-2 text-sm"><span className="text-brand-gold font-bold">✓</span>{v}</li>
            ))}
          </ul>
        </div>
        <p>شكراً لاختيارك YURIVA. كل طلب تدير معنا هو ثقة نقدروها ونحاولو دايما نحسنوا خدمتنا.</p>
      </div>
    </div>
  );
}
