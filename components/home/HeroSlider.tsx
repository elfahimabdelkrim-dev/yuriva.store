"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/types";

interface HeroSliderProps {
  slides: HeroSlide[];
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  fallbackBtnText?: string;
  fallbackBtnLink?: string;
  /** From homepage_sections where section_key = "hero". Applied as bg if no slides. */
  heroSectionImage?: string;
  heroSectionBgColor?: string;
  heroSectionLabel?: string;
}

/** Static hero — shown when there are no active slides with images */
function StaticHero({
  title = "لبس رجالي عملي ومريح",
  subtitle = "سراول Para، Shorts وCargo بجودة مزيانة — توصيل مجاني والدفع عند الاستلام",
  btnText = "شوف المنتجات",
  btnLink = "/products",
  bgImage,
  bgColor,
  heroLabel,
}: {
  title?: string;
  subtitle?: string;
  btnText?: string;
  btnLink?: string;
  bgImage?: string;
  bgColor?: string;
  heroLabel?: string;
}) {
  const hasBgImage = typeof bgImage === "string" && bgImage.trim().length > 0;

  const containerStyle: React.CSSProperties = hasBgImage
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "380px",
      }
    : {
        backgroundColor: bgColor || "#05051F",
        minHeight: "380px",
      };

  return (
    <div
      className="relative w-full flex items-center justify-end overflow-hidden"
      style={containerStyle}
    >
      {/* Dark grid texture + diagonal accent — only when no uploaded image */}
      {!hasBgImage && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, #05051F 60%, #C9A84C22 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)",
            }}
          />
        </>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 w-full py-16 sm:py-24">
        <div className="max-w-xl">
          <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-3">
            {heroLabel || "YURIVA — الأصيل من المغرب"}
          </p>
          <h1 className="text-white text-3xl sm:text-5xl font-black leading-tight mb-4">
            {title}
          </h1>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-8">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={btnLink}
              className="inline-block bg-brand-gold text-white font-black px-8 py-3.5 hover:bg-brand-gold/90 transition-colors text-sm text-center"
            >
              {btnText}
            </Link>
            <Link
              href="/collections/packs"
              className="inline-block border-2 border-white/40 text-white font-bold px-8 py-3.5 hover:bg-white/10 transition-colors text-sm text-center"
            >
              شوف الباكات
            </Link>
          </div>
          {/* Trust micro-badges */}
          <div className="flex flex-wrap gap-4 mt-8">
            {["🚚 توصيل مجاني", "💵 الدفع عند الاستلام", "🔄 تبديل سهل"].map((t) => (
              <span key={t} className="text-white/60 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Gold accent bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-gold/40" />
    </div>
  );
}

export default function HeroSlider({
  slides,
  fallbackTitle,
  fallbackSubtitle,
  fallbackBtnText,
  fallbackBtnLink,
  heroSectionImage,
  heroSectionBgColor,
  heroSectionLabel,
}: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const active = slides.filter(
    (s) => s.is_active && typeof s.image_url === "string" && s.image_url.trim().length > 0
  );

  const next = useCallback(() => setCurrent((c) => (c + 1) % active.length), [active.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + active.length) % active.length), [active.length]);

  useEffect(() => {
    if (active.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, active.length]);

  // No slides with real images → show static branded hero (using admin hero section data)
  if (active.length === 0) {
    return (
      <StaticHero
        title={fallbackTitle}
        subtitle={fallbackSubtitle}
        btnText={fallbackBtnText}
        btnLink={fallbackBtnLink}
        bgImage={heroSectionImage}
        bgColor={heroSectionBgColor}
        heroLabel={heroSectionLabel}
      />
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-brand-navy" style={{ aspectRatio: "16/7" }}>
      {active.map((slide, i) => (
        <div
          key={slide.id || i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <Image
            src={slide.image_url}
            alt={slide.title}
            fill
            className="object-cover"
            priority={i === 0}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-l from-brand-navy/75 via-brand-navy/35 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full">
              <div className="max-w-xl text-white">
                {slide.subtitle && (
                  <p className="text-brand-gold font-bold text-sm mb-2 tracking-wide">{slide.subtitle}</p>
                )}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-5">
                  {slide.title}
                </h1>
                <div className="flex gap-3 flex-wrap">
                  <Link
                    href={slide.button_link}
                    className="inline-block bg-brand-gold text-white font-bold px-6 py-3 hover:bg-brand-gold/90 transition-all text-sm"
                  >
                    {slide.button_text}
                  </Link>
                  <Link
                    href="/products"
                    className="inline-block border border-white/60 text-white font-bold px-6 py-3 hover:bg-white/10 transition-all text-sm"
                  >
                    شوف كل المنتجات
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {active.length > 1 && (
        <>
          <button onClick={prev} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-all" aria-label="السابق">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={next} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-all" aria-label="التالي">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {active.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-brand-gold w-6" : "bg-white/50 w-3"}`} aria-label={`الشريحة ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
