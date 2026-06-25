import type { Metadata } from "next";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "منتج جديد | YURIVA Admin" };

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-black text-brand-navy mb-6">زيد منتج جديد</h1>
      <ProductForm />
    </div>
  );
}
