"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product, ProductColor } from "@/types";
import { formatPrice, formatDiscount, sanitizeProductTitle } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import PackColorSelector from "./PackColorSelector";
import InlineOrderForm from "./InlineOrderForm";

// WhatsApp icon (kept for potential future use)
function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const safePieces = Math.max(1, Math.min(Number(product.pack_pieces) || 1, 20));
  const [packColors, setPackColors] = useState<(ProductColor | null)[]>(
    Array(safePieces).fill(null)
  );
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState("");
  const [colorError, setColorError] = useState("");
  const [packColorErrors, setPackColorErrors] = useState<Record<number, string>>({});

  const discount = product.old_price ? formatDiscount(product.price, product.old_price) : 0;
  const safeReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const avgRating =
    safeReviews.length > 0
      ? safeReviews.reduce((s, r) => s + (r.rating || 0), 0) / safeReviews.length
      : 5;

  const safeColors = Array.isArray(product.colors) ? product.colors : [];
  const safeSizes  = Array.isArray(product.sizes)  ? product.sizes  : [];

  return (
    <div className="space-y-5">
      {/* Badge + Title */}
      <div>
        {product.badge && <Badge className="mb-2">{product.badge}</Badge>}
        <h1 className="text-2xl font-black text-brand-navy leading-tight">
          {sanitizeProductTitle(product.title, product.category_id)}
        </h1>

        {safeReviews.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={Math.round(avgRating)} size="sm" />
            <span className="text-xs text-brand-gray">
              {avgRating.toFixed(1)} ({safeReviews.length} تقييم)
            </span>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-brand-navy">{formatPrice(product.price)}</span>
        {product.old_price && (
          <>
            <span className="text-brand-gray line-through text-lg">{formatPrice(product.old_price)}</span>
            <Badge>وفر {discount}%</Badge>
          </>
        )}
      </div>

      {/* Pack info */}
      {product.is_pack && product.pack_pieces && (
        <div className="bg-brand-gold/10 border border-brand-gold/30 p-3 rounded-sm">
          <p className="text-brand-navy font-bold text-sm">
            🎁 باك {product.pack_pieces} قطع — وفر{" "}
            {product.old_price ? formatPrice(product.old_price - product.price) : ""} مقارنة بالشراء بالقطعة
          </p>
        </div>
      )}

      {/* Short description */}
      <p className="text-brand-gray text-sm leading-relaxed">{product.description}</p>

      {/* Size selector */}
      {safeSizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-brand-navy text-sm">القياس:</span>
            <Link href="/pages/size-guide" className="text-xs text-brand-gold underline">
              ما عارفش القياس ديالك؟
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {safeSizes.map((size) => (
              <button
                key={size}
                onClick={() => { setSelectedSize(size); setSizeError(""); }}
                className={`min-w-[50px] px-4 py-2 border text-sm font-bold transition-all ${
                  selectedSize === size
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "border-gray-300 text-brand-navy hover:border-brand-navy"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {sizeError && <p className="text-red-500 text-xs mt-1">{sizeError}</p>}
        </div>
      )}

      {/* Color selector (non-pack) */}
      {!product.is_pack && safeColors.length > 0 && (
        <div>
          <p className="font-bold text-brand-navy text-sm mb-2">
            اللون: {selectedColor ? selectedColor.label : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {safeColors.map((color) => (
              <button
                key={color.name}
                onClick={() => { setSelectedColor(color); setColorError(""); }}
                title={color.label}
                className={`flex items-center gap-1.5 px-3 py-2 border text-sm font-medium transition-all ${
                  selectedColor?.name === color.name
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-gray-300 text-brand-navy hover:border-brand-navy"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/50 shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                {color.label}
              </button>
            ))}
          </div>
          {colorError && <p className="text-red-500 text-xs mt-1">{colorError}</p>}
        </div>
      )}

      {/* Pack color selector */}
      {product.is_pack && product.allow_piece_colors && safePieces > 0 && (
        <PackColorSelector
          pieces={safePieces}
          colors={safeColors}
          selected={packColors}
          onChange={(i, c) => {
            const updated = [...packColors];
            updated[i] = c;
            setPackColors(updated);
            setPackColorErrors((e) => ({ ...e, [i]: "" }));
          }}
          error={Object.values(packColorErrors).find(Boolean)}
        />
      )}

      {/* Quantity */}
      <div>
        <p className="font-bold text-brand-navy text-sm mb-2">الكمية:</p>
        <div className="flex items-center border border-gray-300 w-fit">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-4 py-2 text-brand-navy hover:bg-brand-light text-lg font-bold"
          >
            −
          </button>
          <span className="px-5 py-2 font-bold text-brand-navy min-w-[50px] text-center">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="px-4 py-2 text-brand-navy hover:bg-brand-light text-lg font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* ── Inline order form — replaces modal ── */}
      <InlineOrderForm
        product={product}
        selectedSize={selectedSize}
        quantity={quantity}
        selectedColor={selectedColor}
        packColors={packColors}
      />
    </div>
  );
}
