"use client";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface MobileStickyBarProps {
  price: number;
  slug: string;
  onAddToCart?: () => void;
}

export default function MobileStickyBar({ price, slug, onAddToCart }: MobileStickyBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200 shadow-2xl pb-safe">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1">
          <p className="text-xs text-brand-gray">الثمن</p>
          <p className="font-black text-brand-navy text-lg">{formatPrice(price)}</p>
        </div>
        <button
          onClick={onAddToCart}
          className="flex-1 bg-brand-navy text-white font-bold py-3 text-sm flex items-center justify-center"
        >
          أضف للسلة
        </button>
        <Link
          href="/checkout"
          className="flex-1 bg-brand-gold text-white font-bold py-3 text-sm flex items-center justify-center"
        >
          اطلب دابا
        </Link>
      </div>
    </div>
  );
}
