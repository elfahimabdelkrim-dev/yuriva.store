import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "اتصل بنا | YURIVA" };

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "اتصل بنا" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-6">اتصل بنا</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-brand-light p-5">
            <h2 className="font-black text-brand-navy mb-2">واتساب</h2>
            <p className="text-brand-gray text-sm mb-3">الأسرع — رد خلال ساعات</p>
            <a href={`https://wa.me/${siteConfig.whatsappNumber}`} target="_blank" rel="noopener noreferrer"
              className="inline-block bg-brand-navy text-white font-bold px-5 py-2.5 text-sm">
              راسلنا فواتساب
            </a>
          </div>
          <div className="bg-brand-light p-5">
            <h2 className="font-black text-brand-navy mb-2">ساعات الخدمة</h2>
            <p className="text-sm text-brand-gray">الاثنين — السبت: 9 صباحاً — 9 مساءً</p>
            <p className="text-sm text-brand-gray">الأحد: 10 صباحاً — 7 مساءً</p>
          </div>
          <div className="bg-brand-light p-5">
            <h2 className="font-black text-brand-navy mb-2">تابعونا</h2>
            <div className="flex gap-3">
              <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer"
                className="text-brand-navy hover:text-brand-gold font-bold text-sm">انستغرام</a>
              <a href={siteConfig.social.tiktok} target="_blank" rel="noopener noreferrer"
                className="text-brand-navy hover:text-brand-gold font-bold text-sm">تيكتوك</a>
              <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer"
                className="text-brand-navy hover:text-brand-gold font-bold text-sm">فيسبوك</a>
            </div>
          </div>
        </div>
        <div className="bg-brand-navy text-white p-6 flex flex-col justify-center">
          <p className="text-4xl mb-3">💬</p>
          <h2 className="font-black text-xl mb-2">أسرع طريقة للتواصل</h2>
          <p className="text-white/70 text-sm mb-4">راسلنا فواتساب وغادي نردو عليك فأقل من ساعة خلال أوقات الخدمة.</p>
          <a href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("مرحباً YURIVA، عندي سؤال")}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-block bg-brand-gold text-white font-bold px-5 py-3 text-sm text-center">
            راسلنا دابا
          </a>
        </div>
      </div>
    </div>
  );
}
