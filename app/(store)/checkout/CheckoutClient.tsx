"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/layout/CartContext";
import { validateMoroccanPhone, formatPrice } from "@/lib/utils";
import { moroccanCities } from "@/data/cities";
import type { CheckoutFormData, OrderItem } from "@/types";
import Breadcrumb from "@/components/ui/Breadcrumb";
import toast from "react-hot-toast";

const EMPTY_FORM: CheckoutFormData = {
  first_name: "",
  last_name: "",
  phone: "",
  city: "",
  address: "",
  notes: "",
};

type FormErrors = Partial<CheckoutFormData>;

export default function CheckoutClient() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [form, setForm] = useState<CheckoutFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

  const filteredCities = moroccanCities.filter((c) =>
    c.includes(citySearch) || c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.first_name.trim()) e.first_name = "الاسم ضروري";
    if (!form.last_name.trim()) e.last_name = "النسب ضروري";
    if (!form.phone.trim()) e.phone = "رقم الهاتف ضروري";
    else if (!validateMoroccanPhone(form.phone)) e.phone = "دخل رقم هاتف مغربي صحيح";
    if (!form.city) e.city = "المدينة ضرورية";
    if (!form.address.trim()) e.address = "العنوان الكامل ضروري";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (items.length === 0) {
      toast.error("سلتك فارغة");
      return;
    }

    setLoading(true);
    try {
      const orderItems: OrderItem[] = items.map((item) => ({
        product_id: item.product_id,
        product_title: item.product_title,
        product_price: item.price,
        quantity: item.quantity,
        size: item.size,
        colors: item.is_pack
          ? JSON.stringify(item.pack_colors?.map((pc) => ({ piece: pc.pieceIndex + 1, color: pc.color.label })))
          : JSON.stringify(item.color ? [{ color: item.color.label }] : []),
        total: item.price * item.quantity,
      }));

const orderId = `YRV-${Date.now()}`;

const newOrder = {
  id: orderId,
  customer_first_name: form.first_name,
  customer_last_name: form.last_name,
  phone: form.phone,
  city: form.city,
  address: form.address,
  notes: form.notes,
  total_amount: total,
  delivery_price: 0,
  payment_method: "cod",
  status: "جديد",
  source: "website",
  items: orderItems,
  created_at: new Date().toISOString(),
};

const savedOrders = localStorage.getItem("yuriva_orders");
const orders = savedOrders ? JSON.parse(savedOrders) : [];

orders.unshift(newOrder);

localStorage.setItem("yuriva_orders", JSON.stringify(orders));
localStorage.setItem("yuriva_last_order", JSON.stringify(newOrder));

const result = {
  success: true,
  order_id: orderId,
  order: newOrder,
};
  if (result.success) {
        clearCart();
        const params = new URLSearchParams({
          order_id: result.order_id || "",
          name: `${form.first_name} ${form.last_name}`,
          phone: form.phone,
          city: form.city,
          total: total.toString(),
        });
        // Save order summary to sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "yuriva_last_order",
            JSON.stringify({ ...result, form, items, total })
          );
        }
        router.push(`/thank-you?${params.toString()}`);
      } else {
        toast.error("وقع خطأ، عاود المحاولة");
      }
    } catch {
      toast.error("وقع خطأ، عاود المحاولة");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-xl font-bold text-brand-navy mb-4">سلتك فارغة</p>
        <Link href="/products" className="inline-block bg-brand-navy text-white font-bold px-6 py-3">
          ارجع للتسوق
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumb items={[{ label: "السلة", href: "/cart" }, { label: "إتمام الطلب" }]} className="mb-5" />
      <h1 className="text-2xl font-black text-brand-navy mb-6">إتمام الطلب</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4" noValidate>
          <div className="bg-white border border-gray-200 p-5">
            <h2 className="font-black text-brand-navy mb-4">معلومات التوصيل</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First name */}
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-1">الاسم *</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => { setForm((f) => ({ ...f, first_name: e.target.value })); setErrors((er) => ({ ...er, first_name: "" })); }}
                  className={`w-full border px-3 py-2.5 text-sm outline-none transition-colors ${errors.first_name ? "border-red-500" : "border-gray-300 focus:border-brand-navy"}`}
                  placeholder="محمد"
                />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
              </div>

              {/* Last name */}
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-1">النسب *</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => { setForm((f) => ({ ...f, last_name: e.target.value })); setErrors((er) => ({ ...er, last_name: "" })); }}
                  className={`w-full border px-3 py-2.5 text-sm outline-none transition-colors ${errors.last_name ? "border-red-500" : "border-gray-300 focus:border-brand-navy"}`}
                  placeholder="بنعلي"
                />
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
              </div>

              {/* Phone */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-brand-navy mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setErrors((er) => ({ ...er, phone: "" })); }}
                  className={`w-full border px-3 py-2.5 text-sm outline-none transition-colors ${errors.phone ? "border-red-500" : "border-gray-300 focus:border-brand-navy"}`}
                  placeholder="06XXXXXXXX"
                  dir="ltr"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              {/* City */}
              <div className="relative sm:col-span-2">
                <label className="block text-sm font-bold text-brand-navy mb-1">المدينة *</label>
                <input
                  type="text"
                  value={form.city || citySearch}
                  onClick={() => setCityOpen(true)}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setForm((f) => ({ ...f, city: "" }));
                    setCityOpen(true);
                    setErrors((er) => ({ ...er, city: "" }));
                  }}
                  className={`w-full border px-3 py-2.5 text-sm outline-none transition-colors ${errors.city ? "border-red-500" : "border-gray-300 focus:border-brand-navy"}`}
                  placeholder="اختار المدينة"
                  readOnly={!!form.city}
                />
                {cityOpen && filteredCities.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 z-20 max-h-48 overflow-y-auto shadow-lg">
                    {filteredCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, city })); setCitySearch(city); setCityOpen(false); setErrors((er) => ({ ...er, city: "" })); }}
                        className="w-full text-right px-4 py-2.5 text-sm hover:bg-brand-light text-brand-navy"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-brand-navy mb-1">العنوان الكامل *</label>
                <textarea
                  value={form.address}
                  onChange={(e) => { setForm((f) => ({ ...f, address: e.target.value })); setErrors((er) => ({ ...er, address: "" })); }}
                  rows={3}
                  className={`w-full border px-3 py-2.5 text-sm outline-none transition-colors resize-none ${errors.address ? "border-red-500" : "border-gray-300 focus:border-brand-navy"}`}
                  placeholder="الحي، الشارع، رقم الدار..."
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-brand-navy mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 focus:border-brand-navy px-3 py-2.5 text-sm outline-none transition-colors resize-none"
                  placeholder="أي معلومات إضافية..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-navy text-white font-bold py-4 text-base hover:bg-opacity-85 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "جاري تسجيل الطلب..." : "أكد الطلب — الدفع عند الاستلام"}
          </button>

          <p className="text-center text-xs text-brand-gray">
            💬 غادي نتاصلو بيك فواتساب باش نأكدو الطلب قبل الإرسال
          </p>
        </form>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-brand-light p-5 sticky top-24">
            <h2 className="font-black text-brand-navy mb-4">ملخص الطلب</h2>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {items.map((item) => {
                const colorsText = item.is_pack && item.pack_colors
                  ? item.pack_colors.map((pc) => `${pc.pieceIndex + 1}: ${pc.color.label}`).join("، ")
                  : item.color?.label || "";
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-16 h-20 flex-none bg-white overflow-hidden">
                      <Image src={item.product_image} alt={item.product_title} fill className="object-cover" />
                      <span className="absolute -top-1 -left-1 bg-brand-navy text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="font-bold text-brand-navy leading-tight">{item.product_title}</p>
                      <p className="text-brand-gray text-xs">القياس: {item.size}</p>
                      {colorsText && <p className="text-brand-gray text-xs">اللون: {colorsText}</p>}
                      <p className="font-bold text-brand-navy mt-1">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-gray">المجموع الجزئي</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-gray">التوصيل</span>
                <span className="font-bold text-brand-gold">مجاني 🎁</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="font-black text-brand-navy">المجموع الكلي</span>
                <span className="font-black text-brand-navy">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-brand-navy text-white text-xs rounded-sm">
              <p className="font-bold mb-1">💵 الدفع عند الاستلام</p>
              <p className="text-white/70">خلص غير ملي توصلك السلعة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
