import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-black text-brand-navy mb-2">404</p>
        <div className="h-1 w-16 bg-brand-gold mx-auto mb-6" />
        <h1 className="text-2xl font-black text-brand-navy mb-2">الصفحة ما موجودتش</h1>
        <p className="text-brand-gray mb-8">
          دوبارك الرابط غالط أو الصفحة تحذفات. ارجع للرئيسية أو ابحث على ما تبغي.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-brand-navy text-white font-bold px-6 py-3"
          >
            <Home className="h-4 w-4" />
            الرئيسية
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 border border-brand-navy text-brand-navy font-bold px-6 py-3"
          >
            <Search className="h-4 w-4" />
            كل المنتجات
          </Link>
        </div>
      </div>
    </div>
  );
}
