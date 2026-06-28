"use client";
import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/types";

interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const validImages = (Array.isArray(images) ? images : []).filter(
    (img) => img && typeof img.url === "string" && img.url.trim().length > 0
  );
  const allImages = validImages.length > 0
    ? validImages
    : [{ url: "/images/placeholder-product.svg", alt: title }];

  const safeActive = Math.min(active, allImages.length - 1);

  const go = (dir: "prev" | "next") => {
    if (dir === "prev") setActive((a) => (a - 1 + allImages.length) % allImages.length);
    else setActive((a) => (a + 1) % allImages.length);
  };

  const mainSrc = imgErrors[safeActive]
    ? "/images/placeholder-product.svg"
    : (allImages[safeActive]?.url || "/images/placeholder-product.svg");

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="relative aspect-product bg-brand-light overflow-hidden"
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart === null) return;
          const diff = touchStart - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) go(diff > 0 ? "next" : "prev");
          setTouchStart(null);
        }}
      >
        <Image
          src={mainSrc}
          alt={allImages[safeActive]?.alt || title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          onError={() => setImgErrors((e) => ({ ...e, [safeActive]: true }))}
          unoptimized
        />

        {/* Counter badge */}
        {allImages.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {safeActive + 1}/{allImages.length}
          </span>
        )}

        {/* Prev/Next arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => go("prev")}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow"
            >
              <ChevronRight className="h-4 w-4 text-brand-navy" />
            </button>
            <button
              onClick={() => go("next")}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow"
            >
              <ChevronLeft className="h-4 w-4 text-brand-navy" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails — horizontal scroll strip, mobile-first */}
      {allImages.length > 1 && (
        <div
          className="flex flex-row gap-2 overflow-x-auto no-scrollbar pb-1"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{ scrollSnapAlign: "start" }}
              className={[
                "relative flex-none w-[72px] h-[88px] rounded-lg border-2 transition-all overflow-hidden",
                i === safeActive
                  ? "border-brand-navy shadow-md"
                  : "border-gray-200 hover:border-brand-navy/50",
              ].join(" ")}
            >
              <Image
                src={imgErrors[i]
                  ? "/images/placeholder-product.svg"
                  : (img.url || "/images/placeholder-product.svg")}
                alt={img.alt || title + " " + (i + 1)}
                fill
                className="object-cover"
                onError={() => setImgErrors((e) => ({ ...e, [i]: true }))}
                unoptimized
              />
              {i === safeActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-brand-navy rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
