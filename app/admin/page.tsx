import type { Metadata } from "next";
import Link from "next/link";
import { Package, ShoppingBag, Tag, Settings, TrendingUp, Eye } from "lucide-react";

export const metadata: Metadata = { title: "لوحة التحكم | YURIVA Admin" };

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function StatCard({ label, value, sub, icon: Icon, href }: { label: string; value: string | number; sub?: string; icon: React.ElementType; href: string }) {
  return (
    <Link href={href} className="bg-white p-5 border border-gray-200 hover:border-brand-gold transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-brand-navy/5 rounded flex items-center justify-center group-hover:bg-brand-gold/10">
          <Icon className="h-5 w-5 text-brand-navy group-hover:text-brand-gold" />
        </div>
        <span className="text-xs text-brand-gold font-bold">عرض ←</span>
      </div>
      <p className="text-2xl font-black text-brand-navy">{value}</p>
      <p className="text-sm font-bold text-brand-navy mt-0.5">{label}</p>
      {sub && <p className="text-xs text-brand-gray mt-0.5">{sub}</p>}
    </Link>
  );
}

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-brand-navy">لوحة التحكم</h1>
        <p className="text-brand-gray text-sm mt-1">
          أهلاً بيك فـ admin panel ديال YURIVA
          {!hasSupabase && " — (وضع static)"}
        </p>
      </div>

      {!hasSupabase && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded">
          <p className="font-bold text-yellow-800 mb-1">⚠️ Supabase مش مربوط</p>
          <p className="text-yellow-700 text-sm">
            زيد NEXT_PUBLIC_SUPABASE_URL، NEXT_PUBLIC_SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY فـ .env.local باش تخدم جميع ميزات الـ admin.
          </p>
          <Link href="/admin/settings" className="text-yellow-800 font-bold text-sm underline mt-2 inline-block">
            شوف إعدادات المتجر
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="إجمالي الطلبات" value={hasSupabase ? "—" : "0"} sub="اربط Supabase لتفعيل" icon={ShoppingBag} href="/admin/orders" />
        <StatCard label="المنتجات" value={4} sub="4 منتجات نشطة" icon={Package} href="/admin/products" />
        <StatCard label="التصنيفات" value={7} sub="7 تصنيفات" icon={Tag} href="/admin/categories" />
        <StatCard label="إعدادات المتجر" value="✓" sub="متجر جاهز" icon={Settings} href="/admin/settings" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="font-black text-brand-navy mb-4">إجراءات سريعة</h2>
          <div className="space-y-2">
            {[
              { label: "زيد منتج جديد", href: "/admin/products/new" },
              { label: "شوف الطلبات الجديدة", href: "/admin/orders" },
              { label: "بدل إعدادات المتجر", href: "/admin/settings" },
              { label: "بدل الصفحة الرئيسية", href: "/admin/homepage" },
              { label: "بدل إعدادات التتبع", href: "/admin/tracking" },
              { label: "إعداد Google Sheet", href: "/admin/google-sheets" },
            ].map((link) => (
              <Link key={link.href} href={link.href}
                className="flex items-center justify-between px-3 py-2.5 bg-brand-light hover:bg-brand-gold/10 hover:text-brand-gold text-sm font-medium text-brand-navy transition-colors">
                <span>{link.label}</span>
                <span>←</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5">
          <h2 className="font-black text-brand-navy mb-4">حالة المتجر</h2>
          <div className="space-y-3">
            {[
              { label: "المتجر العام", status: "✅ يخدم", color: "text-green-600" },
              { label: "Supabase", status: hasSupabase ? "✅ مربوط" : "⚠️ غير مربوط", color: hasSupabase ? "text-green-600" : "text-yellow-600" },
              { label: "التوصيل المجاني", status: "✅ فعال", color: "text-green-600" },
              { label: "واتساب", status: "✅ فعال", color: "text-green-600" },
              { label: "SEO", status: "✅ مفعل", color: "text-green-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-brand-gray">{item.label}</span>
                <span className={`font-bold ${item.color}`}>{item.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <Link href="/" target="_blank" className="text-brand-gold font-bold text-sm hover:underline">
              شوف المتجر العام ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
