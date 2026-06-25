"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category } from "@/types";

interface CategoryCarouselProps {
  categories: Category[];
}

export default function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <section className="py-8 bg-brand-light">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-brand-navy">تسوق حسب التصنيف</h2>
          <div className="flex gap-2">
            <button onClick={() => scroll("right")} className="p-1.5 border border-gray-200 hover:border-brand-gold hover:text-brand-gold transition-colors rounded">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => scroll("left")} className="p-1.5 border border-gray-200 hover:border-brand-gold hover:text-brand-gold transition-colors rounded">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/collections/${cat.slug}`}
              className="flex-none group"
            >
              <div className="w-24 sm:w-28 flex flex-col items-center gap-2">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-brand-navy relative border-2 border-transparent group-hover:border-brand-gold transition-all duration-200">
                  <Image
                    src={cat.image_url || "/images/placeholder-category.svg"}
                    alt={cat.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="text-xs font-bold text-brand-navy text-center group-hover:text-brand-gold transition-colors leading-tight">
                  {cat.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
