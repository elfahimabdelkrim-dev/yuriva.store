"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Home, Star,
  HelpCircle, Settings, Image, Truck, Percent, Ban, BarChart3,
  FileSpreadsheet, Menu, X, LogOut, ChevronDown, ChevronUp
} from "lucide-react";

const hasSupabase = !!(
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NAV = [
  { label: "لوحة التحكم", href: "/admin", icon: LayoutDashboard },
  { label: "الطلبات", href: "/admin/orders", icon: ShoppingBag },
  { label: "المنتجات", href: "/admin/products", icon: Package },
  { label: "التصنيفات", href: "/admin/categories", icon: Tag },
  { label: "الصفحة الرئيسية", href: "/admin/homepage", icon: Home },
  { label: "التقييمات", href: "/admin/reviews", icon: Star },
  { label: "الأسئلة الشائعة", href: "/admin/faq", icon: HelpCircle },
  { label: "الوسائط", href: "/admin/media", icon: Image },
  { label: "التوصيل", href: "/admin/delivery", icon: Truck },
  { label: "الكوبونات", href: "/admin/coupons", icon: Percent },
  { label: "القائمة السوداء", href: "/admin/blacklist", icon: Ban },
  { label: "التتبع والإحصائيات", href: "/admin/tracking", icon: BarChart3 },
  { label: "Google Sheet", href: "/admin/google-sheets", icon: FileSpreadsheet },
  { label: "إعدادات المتجر", href: "/admin/settings", icon: Settings },
];

function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 right-0 h-full w-64 bg-brand-navy text-white z-50 flex flex-col transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      } lg:relative lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Link href="/admin" className="text-2xl font-black tracking-widest text-white hover:text-brand-gold">
            YURIVA
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Admin badge */}
        <div className="px-4 py-2 border-b border-white/10">
          <span className="text-xs text-brand-gold font-bold">لوحة التحكم</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "bg-brand-gold text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <Link href="/" target="_blank" className="flex items-center gap-2 text-xs text-white/60 hover:text-white">
            شوف المتجر ↗
          </Link>
          <Link href="/admin/login" className="flex items-center gap-2 text-xs text-white/60 hover:text-red-400">
            <LogOut className="h-3.5 w-3.5" />
            خروج
          </Link>
        </div>
      </aside>
    </>
  );
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {!hasSupabase && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-1.5 rounded">
              ⚠️ وضع static — ربط Supabase لتفعيل كل الميزات
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
