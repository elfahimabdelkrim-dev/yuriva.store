import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { LayoutStyle } from "@/components/layout/Header";

// ── Style helpers ──────────────────────────────────────────────────────────
const NAVY  = "#05051F";
const WHITE = "#FFFFFF";

function validHex(c?: string): string | undefined {
  return /^#[0-9A-Fa-f]{3,8}$/.test(c || "") ? c : undefined;
}

function rgba(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Footer columns ─────────────────────────────────────────────────────────
const COLUMNS = [
  {
    title: "المساعدة",
    links: [
      { label: "اتصل بنا", href: "/pages/contact" },
      { label: "تتبع الطلب", href: "/track-order" },
      { label: "كيفاش تطلب؟", href: "/pages/how-to-order" },
      { label: "دليل القياسات", href: "/pages/size-guide" },
      { label: "الأسئلة الشائعة", href: "/pages/faq" },
    ],
  },
  {
    title: "خدماتنا",
    links: [
      { label: "التوصيل والتبديل", href: "/pages/delivery-exchange" },
      { label: "سياسة الإرجاع", href: "/pages/return-policy" },
      { label: "الدفع عند الاستلام", href: "/pages/how-to-order" },
      { label: "شروط الاستخدام", href: "/pages/terms" },
      { label: "سياسة الخصوصية", href: "/pages/privacy-policy" },
    ],
  },
  {
    title: "التصنيفات",
    links: [
      { label: "سراول Para", href: "/collections/pantalons-para" },
      { label: "Shorts Para", href: "/collections/shorts-para" },
      { label: "Cargo", href: "/collections/cargo" },
      { label: "باكات", href: "/collections/packs" },
      { label: "العروض", href: "/collections/offers" },
    ],
  },
  {
    title: "عن YURIVA",
    links: [
      { label: "من نحن", href: "/pages/about" },
      { label: "جميع المنتجات", href: "/products" },
      { label: "الأكثر مبيعاً", href: "/collections/best-sellers" },
      { label: "الجديد", href: "/collections/new-arrivals" },
    ],
  },
];

interface FooterProps {
  footerStyle?: LayoutStyle;
}

export default function Footer({ footerStyle }: FooterProps) {
  const bgColor   = validHex(footerStyle?.bgColor)   || NAVY;
  const textColor = validHex(footerStyle?.textColor)  || WHITE;
  const bgImg     = footerStyle?.bgImage || "";

  const footerInlineStyle: React.CSSProperties = bgImg
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.72),rgba(0,0,0,0.72)), url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: bgColor,
        color: textColor,
      }
    : { backgroundColor: bgColor, color: textColor };

  const dim60 = rgba(textColor, 0.60);
  const dim40 = rgba(textColor, 0.40);
  const dim10 = rgba(textColor, 0.10);

  return (
    <footer className="mt-16" dir="rtl" style={footerInlineStyle}>
      {/* Trust bar */}
      <div className="border-b py-8" style={{ borderColor: dim10 }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "🚚", label: "توصيل مجاني", sub: "لجميع مدن المغرب" },
              { icon: "💵", label: "الدفع عند الاستلام", sub: "ادفع ملي توصلك السلعة" },
              { icon: "💬", label: "تأكيد عبر واتساب", sub: "نتاصلو بيك قبل الإرسال" },
              { icon: "🔄", label: "تبديل سهل", sub: "خلال 7 أيام من الاستلام" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-bold text-sm">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: dim60 }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="text-3xl font-black tracking-widest hover:text-brand-gold transition-colors">
              YURIVA
            </Link>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: dim60 }}>
              سراول Para، Shorts، Cargo وباكات للرجال — جودة عالمية بثمن مغربي.
            </p>
            <div className="flex gap-3 mt-4">
              <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer"
                className="hover:text-brand-gold text-xs transition-colors" style={{ color: dim60 }}>
                فيسبوك
              </a>
              <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer"
                className="hover:text-brand-gold text-xs transition-colors" style={{ color: dim60 }}>
                انستغرام
              </a>
              <a href={siteConfig.social.tiktok} target="_blank" rel="noopener noreferrer"
                className="hover:text-brand-gold text-xs transition-colors" style={{ color: dim60 }}>
                تيكتوك
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-bold text-sm mb-4">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-brand-gold transition-colors"
                      style={{ color: dim60 }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t py-5" style={{ borderColor: dim10 }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: dim40 }}>
            © {new Date().getFullYear()} YURIVA. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: dim40 }}>طريقة الدفع:</span>
            <span className="text-brand-gold text-xs font-bold bg-brand-gold/10 px-2 py-0.5 rounded">
              💵 الدفع عند الاستلام
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
