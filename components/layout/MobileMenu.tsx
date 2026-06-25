"use client";
import { X, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { siteConfig } from "@/config/site";

const NAV_LINKS = [
  { label: "الرئيسية", href: "/" },
  { label: "سراول Para", href: "/collections/pantalons-para" },
  { label: "Shorts Para", href: "/collections/shorts-para" },
  { label: "Cargo", href: "/collections/cargo" },
  { label: "باكات", href: "/collections/packs" },
  { label: "العروض", href: "/collections/offers" },
  { label: "الأكثر مبيعاً", href: "/collections/best-sellers" },
  { label: "الجديد", href: "/collections/new-arrivals" },
];

const INFO_LINKS = [
  { label: "كيفاش تطلب؟", href: "/pages/how-to-order" },
  { label: "دليل القياسات", href: "/pages/size-guide" },
  { label: "التوصيل والتبديل", href: "/pages/delivery-exchange" },
  { label: "اتصل بنا", href: "/pages/contact" },
  { label: "من نحن", href: "/pages/about" },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-80 max-w-full bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-xl font-black text-brand-navy tracking-widest">YURIVA</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4">
          <p className="px-4 text-xs text-brand-gray font-semibold uppercase tracking-wider mb-2">التصنيفات</p>
          <nav>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 text-brand-navy font-medium hover:bg-brand-light hover:text-brand-gold transition-colors border-b border-gray-50"
              >
                <span>{link.label}</span>
                <ChevronLeft className="h-4 w-4 text-brand-gray rotate-180" />
              </Link>
            ))}
          </nav>

          <div className="mt-6">
            <p className="px-4 text-xs text-brand-gray font-semibold uppercase tracking-wider mb-2">معلومات</p>
            <nav>
              {INFO_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 text-brand-navy font-medium hover:bg-brand-light hover:text-brand-gold transition-colors border-b border-gray-50"
                >
                  <span>{link.label}</span>
                  <ChevronLeft className="h-4 w-4 text-brand-gray rotate-180" />
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-brand-light">
          <a
            href={`https://wa.me/${siteConfig.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-brand-navy text-white py-3 font-bold w-full"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
            </svg>
            تواصل معنا فواتساب
          </a>
        </div>
      </div>
    </>
  );
}
