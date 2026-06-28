export const siteConfig = {
  name: "YURIVA",
  description:
    "سراول Para، Shorts Para، Cargo pants، Packs ديال الملابس الرجالية — توصيل مجاني والدفع عند الاستلام",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://yuriva.store",
  whatsappNumber:
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "212600000000",
  colors: {
    white: "#FFFFFF",
    light: "#F8F8F8",
    navy: "#05051F",
    gold: "#C9A84C",
    gray: "#6B7280",
  },
  seo: {
    defaultTitle: "YURIVA | سراول Para وShorts الرجالية — توصيل مجاني المغرب",
    defaultDescription:
      "اشري أحسن سراول Para، Shorts Para وCargo pants فالمغرب. توصيل مجاني، الدفع عند الاستلام. pantalon para homme maroc، short para homme maroc، cargo pants maroc.",
    keywords:
      "pantalon para maroc, pantalon para homme maroc, short para homme maroc, shorts para maroc, cargo pants maroc, pantalon cargo homme maroc, pantalon homme livraison gratuite maroc, pack pantalon homme maroc, srawal para maroc, vêtements homme maroc, paiement à la livraison maroc",
  },
  social: {
    facebook: "https://facebook.com/yuriva.ma",
    instagram: "https://instagram.com/yuriva.ma",
    tiktok: "https://tiktok.com/@yuriva.ma",
  },
  announcement:
    "🔥 عرض محدود اليوم فقط | توصيل مجاني داخل المغرب | الدفع عند الاستلام",
  trustBadges: [
    { icon: "truck", label: "توصيل مجاني" },
    { icon: "cash", label: "الدفع عند الاستلام" },
    { icon: "whatsapp", label: "تأكيد عبر واتساب" },
    { icon: "refresh", label: "تبديل سهل" },
    { icon: "star", label: "جودة مضمونة" },
  ],
};
