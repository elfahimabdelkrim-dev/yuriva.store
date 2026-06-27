"use client";
import { useState } from "react";
import type { Product, ProductColor } from "@/types";
import { formatPrice, formatDiscount, sanitizeProductTitle } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import PackColorSelector from "./PackColorSelector";
import InlineOrderForm from "./InlineOrderForm";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const safePieces = Math.max(1, Math.min(Number(product.pack_pieces) || 1, 20));
  const [packColors, setPackColors] = useState<(ProductColor | null)[]>(
    Array(safePieces).fill(null)
  );
  const [colorError,      setColorError]      = useState("");
  const [packColorErrors, setPackColorErrors] = useState<Record<number, string>>({});

  const discount    = product.old_price ? formatDiscount(product.price, product.old_price) : 0;
  const safeReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const avgRating   =
    safeReviews.length > 0
      ? safeReviews.reduce((s, r) => s + (r.rating || 0), 0) / safeReviews.length
      : 5;

  const safeColors = Array.isArray(product.colors) ? product.colors : [];

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

      {/* Color selector (non-pack) — stays here, affects product display */}
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

      {/* ── Inline checkout form ──────────────────────────────────────────── */}
      {/* Size selector + customer fields + submit buttons all inside the form */}
      <InlineOrderForm
        product={product}
        selectedColor={selectedColor}
        packColors={packColors}
      />
    </div>
  );
}
