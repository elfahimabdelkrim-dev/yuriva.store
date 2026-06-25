"use client";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

interface ProductAccordionProps {
  items: AccordionItem[];
}

export default function ProductAccordion({ items }: ProductAccordionProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="border-t border-gray-200">
      {items.map((item, i) => (
        <div key={i} className="border-b border-gray-200">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between py-4 text-right"
          >
            <span className="font-bold text-brand-navy text-sm">{item.title}</span>
            {open === i ? (
              <Minus className="h-4 w-4 text-brand-gold flex-shrink-0" />
            ) : (
              <Plus className="h-4 w-4 text-brand-gold flex-shrink-0" />
            )}
          </button>
          {open === i && (
            <div className="pb-4 text-brand-gray text-sm leading-relaxed">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
