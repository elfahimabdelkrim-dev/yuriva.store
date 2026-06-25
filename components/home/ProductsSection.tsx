import Link from "next/link";
import type { Product } from "@/types";
import ProductCard from "@/components/product/ProductCard";

interface ProductsSectionProps {
  title: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
}

export default function ProductsSection({
  title,
  products,
  viewAllHref,
  viewAllLabel = "شوف الكل",
}: ProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-brand-navy">{title}</h2>
            <div className="h-0.5 w-12 bg-brand-gold mt-1.5" />
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-sm font-bold text-brand-navy border-b border-brand-navy hover:text-brand-gold hover:border-brand-gold transition-colors pb-0.5"
            >
              {viewAllLabel}
            </Link>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
