"use client";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
  title?: string;
}

export default function FAQSection({ faqs, title = "الأسئلة الشائعة" }: FAQSectionProps) {
  const [open, setOpen] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  return (
    <section className="py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl font-black text-brand-navy text-center mb-2">{title}</h2>
        <div className="h-0.5 w-12 bg-brand-gold mx-auto mb-8" />

        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="border border-gray-200 hover:border-brand-gold transition-colors">
              <button
                onClick={() => setOpen(open === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-right gap-3"
              >
                <span className="font-bold text-brand-navy text-sm leading-relaxed">
                  {faq.question}
                </span>
                {open === faq.id ? (
                  <Minus className="h-4 w-4 text-brand-gold flex-shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-brand-gold flex-shrink-0" />
                )}
              </button>
              {open === faq.id && (
                <div className="px-5 pb-4 text-brand-gray text-sm leading-relaxed border-t border-gray-100">
                  <p className="pt-3">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
