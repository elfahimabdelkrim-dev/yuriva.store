"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Eye } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice, formatDiscount, sanitizeProductTitle } from "@/lib/utils";
import { useCart } from "@/components/layout/CartContext";
import { generateCartItemId } from "@/lib/cart";
import toast from "react-hot-toast";

const PLACEHOLDER = "/images/placeholder-product.svg";

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [imgErr, setImgErr] = useState(false);
  const discount = product.old_price ? formatDiscount(product.price, product.old_price) : 0;
  const avgRating =
    product.reviews && product.reviews.length > 0
      ? Math.round(product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length)
      : 5;

  const imgSrc = imgErr || !product.main_image ? PLACEHOLDER : product.main_image;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.is_pack || product.colors.length > 1 || product.sizes.length > 1) {
      window.location.href = `/products/${product.slug}`;
      return;
    }
    addToCart({
      id: generateCartItemId(),
      product_id: product.id,
      product_title: product.title,
      product_slug: product.slug,
      product_image: product.main_image || PLACEHOLDER,
      price: product.price,
      quantity: 1,
      size: product.sizes[0] || "M",
      color: product.colors[0],
      is_pack: false,
    });
    toast.success("تزادت للسلة");
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block bg-white">
      {/* Image container */}
      <div className="relative overflow-hidden bg-[#F3F3F3] aspect-[3/4]">
        <Image
          src={imgSrc}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={() => setImgErr(true)}
          unoptimized
        />

        {/* Top badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {product.is_pack && product.pack_pieces && (
            <span className="bg-brand-navy text-white text-[10px] font-black px-2 py-0.5 tracking-wide">
              باك {product.pack_pieces} قطع
            </span>
          )}
          {product.badge && (
            <span className="bg-brand-gold text-white text-[10px] font-black px-2 py-0.5 tracking-wide">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5">
              -{discount}%
            </span>
          )}
        </div>

        {/* Color swatches */}
        {product.colors.length > 1 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.colors.slice(0, 4).map((c) => (
              <span
                key={c.name}
                className="w-4 h-4 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        )}

        {/* Hover overlay — action buttons */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleQuickAdd}
            className="flex items-center justify-center gap-2 bg-brand-navy text-white text-xs font-bold py-2.5 w-full hover:bg-brand-gold transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            زيد للسلة
          </button>
          <span className="flex items-center justify-center gap-1.5 bg-white/90 text-brand-navy text-xs font-bold py-2 w-full">
            <Eye className="h-3.5 w-3.5" />
            شوف التفاصيل
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-1 pt-2.5 pb-3">
        {/* Stars */}
        <div className="flex items-center gap-1 mb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className={`w-3 h-3 ${i < avgRating ? "text-brand-gold" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          {product.reviews && product.reviews.length > 0 && (
            <span className="text-[10px] text-brand-gray">({product.reviews.length})</span>
          )}
        </div>

        <h3 className="font-bold text-brand-navy text-sm leading-snug mb-2 line-clamp-2">
          {sanitizeProductTitle(product.title, product.category_id)}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-brand-navy font-black text-base">{formatPrice(product.price)}</span>
          {product.old_price && (
            <span className="text-brand-gray text-xs line-through">{formatPrice(product.old_price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
