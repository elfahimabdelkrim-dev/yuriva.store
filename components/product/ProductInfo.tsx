"use client";
import type { Product } from "@/types";
import { formatPrice, formatDiscount, sanitizeProductTitle } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import InlineOrderForm from "./InlineOrderForm";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const discount    = product.old_price ? formatDiscount(product.price, product.old_price) : 0;
  const safeReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const avgRating   =
    safeReviews.length > 0
      ? safeReviews.reduce((s, r) => s + (r.rating || 0), 0) / safeReviews.length
      : 5;

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

      {/* Inline checkout form — manages size, color, and order submission */}
      <InlineOrderForm product={product} />
    </div>
  );
}
