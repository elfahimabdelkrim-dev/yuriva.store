"use client";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="h-1 w-12 bg-brand-gold mx-auto mb-6" />
        <h1 className="text-xl font-black text-brand-navy mb-2">
          وقع مشكل فتحميل المنتج
        </h1>
        <p className="text-brand-gray text-sm mb-8">
          عاود المحاولة أو ارجع للمنتجات
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-brand-navy text-white font-bold px-6 py-3 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            عاود المحاولة
          </button>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 border border-brand-navy text-brand-navy font-bold px-6 py-3 text-sm"
          >
            <Home className="h-4 w-4" />
            كل المنتجات
          </Link>
        </div>
      </div>
    </div>
  );
}
