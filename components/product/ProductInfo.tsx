"use client";
import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, MessageCircle, Truck, RefreshCw, CreditCard, ShoppingBag } from "lucide-react";
import type { Product, ProductColor } from "@/types";
import { formatPrice, formatDiscount, sanitizeProductTitle } from "@/lib/utils";
import { useCart } from "@/components/layout/CartContext";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import PackColorSelector from "./PackColorSelector";
import DirectOrderModal from "./DirectOrderModal";
import toast from "react-hot-toast";

function generateId() {
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface ProductInfoProps {
  product: Product;
}

type ModalMode = "cod" | "whatsapp";

export default function ProductInfo({ product }: ProductInfoProps) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const safePieces = Math.max(1, Math.min(Number(product.pack_pieces) || 1, 20));
  const [packColors, setPackColors] = useState<(ProductColor | null)[]>(
    Array(safePieces).fill(null)
  );
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);

  const discount = product.old_price ? formatDiscount(product.price, product.old_price) : 0;
  const safeReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const avgRating =
    safeReviews.length > 0
      ? safeReviews.reduce((s, r) => s + (r.rating || 0), 0) / safeReviews.length
      : 5;

  const safeColors = Array.isArray(product.colors) ? product.colors : [];
  const safeSizes  = Array.isArray(product.sizes)  ? product.sizes  : [];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (safeSizes.length > 0 && !selectedSize) newErrors.size = "خاصك تختار القياس";
    if (product.is_pack && product.allow_piece_colors) {
      packColors.forEach((c, i) => {
        if (!c) newErrors[`pack_color_${i}`] = `خاصك تختار لون القطعة ${i + 1}`;
      });
    } else if (!product.is_pack && safeColors.length > 0 && !selectedColor) {
      newErrors.color = "خاصك تختار اللون";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddToCart = () => {
    if (!validate()) return;

    const colorsForCart = product.is_pack
      ? packColors.map((c, i) => ({ pieceIndex: i, color: c! }))
      : undefined;

    addToCart({
      id: generateId(),
      product_id: product.id,
      product_title: product.title,
      product_slug: product.slug,
      product_image: product.main_image,
      price: product.price,
      quantity,
      size: selectedSize,
      color: product.is_pack ? undefined : (selectedColor || undefined),
      pack_colors: colorsForCart,
      is_pack: product.is_pack,
      pack_pieces: product.pack_pieces,
    });
    toast.success("تمت الإضافة للسلة!");
  };

  // Validate size/color then open modal
  const openModal = (mode: ModalMode) => {
    const newErrors: Record<string, string> = {};
    if (safeSizes.length > 0 && !selectedSize) newErrors.size = "خاصك تختار القياس";
    if (product.is_pack && product.allow_piece_colors) {
      packColors.forEach((c, i) => {
        if (!c) newErrors[`pack_color_${i}`] = `خاصك تختار لون القطعة ${i + 1}`;
      });
    } else if (!product.is_pack && safeColors.length > 0 && !selectedColor) {
      newErrors.color = "خاصك تختار اللون";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setModalMode(mode);
  };

  return (
    <>
      <div className="space-y-5">
        {/* Badge + Title */}
        <div>
          {product.badge && <Badge className="mb-2">{product.badge}</Badge>}
          <h1 className="text-2xl font-black text-brand-navy leading-tight">
            {sanitizeProductTitle(product.title, product.category_id)}
          </h1>

          {/* Rating */}
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
                onClick={() => { setSelectedSize(size); setErrors((e) => ({ ...e, size: "" })); }}
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
          {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
        </div>

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
                  onClick={() => { setSelectedColor(color); setErrors((e) => ({ ...e, color: "" })); }}
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
            {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color}</p>}
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
              setErrors((e) => ({ ...e, [`pack_color_${i}`]: "" }));
            }}
            error={Object.entries(errors).find(([k]) => k.startsWith("pack_color"))?.[1]}
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

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          {/* Add to Cart — unchanged */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-brand-navy text-white font-bold py-4 flex items-center justify-center gap-2 hover:bg-opacity-85 transition-all text-base"
          >
            <ShoppingCart className="h-5 w-5" />
            أضف للسلة
          </button>

          {/* اشترِ الآن — direct COD (was: اطلب دابا — الدفع عند الاستلام) */}
          <button
            onClick={() => openModal("cod")}
            className="w-full bg-brand-gold text-white font-bold py-4 flex items-center justify-center gap-2 hover:bg-opacity-85 transition-all text-base"
          >
            <ShoppingBag className="h-5 w-5" />
            اشترِ الآن
          </button>

          {/* اطلب عبر واتساب — saves order first, then opens WhatsApp */}
          <button
            onClick={() => openModal("whatsapp")}
            className="w-full border-2 border-brand-navy text-brand-navy font-bold py-4 flex items-center justify-center gap-2 hover:bg-brand-navy hover:text-white transition-all text-base"
          >
            <MessageCircle className="h-5 w-5" />
            اطلب عبر واتساب
          </button>
        </div>

        {/* Trust mini badges */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          {[
            { icon: <Truck className="h-4 w-4" />, text: "توصيل مجاني" },
            { icon: <CreditCard className="h-4 w-4" />, text: "الدفع عند الاستلام" },
            { icon: <MessageCircle className="h-4 w-4" />, text: "تأكيد عبر واتساب" },
            { icon: <RefreshCw className="h-4 w-4" />, text: "تبديل سهل" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-xs text-brand-gray">
              <span className="text-brand-gold">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Direct order modal — renders outside the scroll container */}
      {modalMode && (
        <DirectOrderModal
          product={product}
          defaultSize={selectedSize}
          defaultQuantity={quantity}
          selectedColor={selectedColor}
          packColors={packColors}
          mode={modalMode}
          onClose={() => setModalMode(null)}
        />
      )}
    </>
  );
}
