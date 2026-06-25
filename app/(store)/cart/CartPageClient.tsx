"use client";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCart } from "@/components/layout/CartContext";
import { formatPrice } from "@/lib/utils";
import Breadcrumb from "@/components/ui/Breadcrumb";

export default function CartPageClient() {
  const { items, count, total, removeFromCart, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-brand-navy mb-2">سلتك فارغة</h1>
        <p className="text-brand-gray mb-6">زيد منتجات من كتالوج YURIVA</p>
        <Link href="/products" className="inline-block bg-brand-navy text-white font-bold px-8 py-3">
          تسوق دابا
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumb items={[{ label: "سلة التسوق" }]} className="mb-5" />
      <h1 className="text-2xl font-black text-brand-navy mb-6">سلة التسوق ({count})</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const colorsText = item.is_pack && item.pack_colors
              ? item.pack_colors.map((pc) => `قطعة ${pc.pieceIndex + 1}: ${pc.color.label}`).join("، ")
              : item.color?.label || "";

            return (
              <div key={item.id} className="flex gap-4 bg-brand-light p-4 relative">
                {/* Image */}
                <Link href={`/products/${item.product_slug}`} className="flex-none">
                  <div className="w-24 h-28 relative overflow-hidden bg-white">
                    <Image
                      src={item.product_image}
                      alt={item.product_title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product_slug}`}>
                    <h3 className="font-bold text-brand-navy text-sm leading-tight mb-1 hover:text-brand-gold transition-colors">
                      {item.product_title}
                    </h3>
                  </Link>
                  <div className="text-xs text-brand-gray space-y-0.5">
                    <p>القياس: <span className="font-bold text-brand-navy">{item.size}</span></p>
                    {colorsText && <p>اللون: <span className="font-bold text-brand-navy">{colorsText}</span></p>}
                    {item.is_pack && item.pack_pieces && (
                      <p className="text-brand-gold font-bold">باك {item.pack_pieces} قطع</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity */}
                    <div className="flex items-center border border-gray-300 bg-white">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1.5 hover:bg-brand-light text-brand-navy"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-3 text-sm font-bold text-brand-navy">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1.5 hover:bg-brand-light text-brand-navy"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <span className="font-black text-brand-navy">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="absolute top-3 left-3 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="حذف المنتج"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-brand-light p-5 sticky top-24">
            <h2 className="font-black text-brand-navy text-lg mb-4">ملخص الطلب</h2>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-brand-gray">المجموع الجزئي ({count} منتج)</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-gray">التوصيل</span>
                <span className="font-bold text-brand-gold">مجاني 🎁</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3 mb-5">
              <div className="flex justify-between">
                <span className="font-black text-brand-navy">المجموع الكلي</span>
                <span className="font-black text-brand-navy text-xl">{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-brand-gray mt-1">شامل التوصيل المجاني</p>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-brand-navy text-white font-bold py-4 text-center mb-3"
            >
              أكد الطلب
            </Link>
            <Link
              href="/products"
              className="block w-full border border-brand-navy text-brand-navy font-bold py-3 text-center text-sm"
            >
              كمل التسوق
            </Link>

            {/* Trust badges */}
            <div className="mt-4 space-y-2 text-xs text-brand-gray">
              <p className="flex items-center gap-2">🚚 توصيل مجاني لجميع المدن</p>
              <p className="flex items-center gap-2">💵 الدفع عند الاستلام فقط</p>
              <p className="flex items-center gap-2">💬 تأكيد الطلب عبر واتساب</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
