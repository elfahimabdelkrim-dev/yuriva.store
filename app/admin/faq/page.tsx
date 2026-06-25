"use client";
import { staticFAQs } from "@/data/settings";

export default function AdminFAQPage() {
  return (
    <div>
      <h1 className="text-2xl font-black text-brand-navy mb-6">الأسئلة الشائعة</h1>
      <div className="space-y-3">
        {staticFAQs.map((f) => (
          <div key={f.id} className="bg-white border border-gray-200 p-4">
            <p className="font-bold text-brand-navy text-sm mb-1">{f.question}</p>
            <p className="text-brand-gray text-sm">{f.answer}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-brand-gray text-sm mt-4">ربط Supabase لإدارة الأسئلة ديناميكياً</p>
    </div>
  );
}
