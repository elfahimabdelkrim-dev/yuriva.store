export default function TrustBadges() {
  const badges = [
    { icon: "🚚", title: "توصيل مجاني", desc: "لجميع مدن المغرب بدون استثناء" },
    { icon: "💵", title: "الدفع عند الاستلام", desc: "خلص غير ملي توصلك السلعة" },
    { icon: "💬", title: "تأكيد عبر واتساب", desc: "نتاصلو بيك قبل الإرسال" },
    { icon: "🔄", title: "تبديل سهل", desc: "خلال 7 أيام من الاستلام" },
    { icon: "⭐", title: "جودة مضمونة", desc: "منتجات عملية للاستعمال اليومي" },
  ];

  return (
    <section className="py-12 bg-brand-navy text-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black text-center mb-8">
          علاش تختار <span className="text-brand-gold">YURIVA</span>؟
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {badges.map((badge) => (
            <div
              key={badge.title}
              className="flex flex-col items-center text-center gap-3 p-4 border border-white/10 hover:border-brand-gold transition-colors rounded-sm"
            >
              <span className="text-4xl">{badge.icon}</span>
              <div>
                <p className="font-bold text-sm">{badge.title}</p>
                <p className="text-white/60 text-xs mt-1 leading-relaxed">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
