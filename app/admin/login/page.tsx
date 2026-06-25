"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const hasSupabase = !!(
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabase) {
      toast.error("خاصك تربط Supabase باش تخدم admin dashboard");
      return;
    }
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("الإيميل أو كلمة السر غلط");
      } else {
        router.push("/admin");
      }
    } catch {
      toast.error("وقع خطأ، عاود المحاولة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-widest">YURIVA</h1>
          <p className="text-white/60 text-sm mt-2">لوحة التحكم</p>
        </div>

        {!hasSupabase && (
          <div className="bg-yellow-900/30 border border-yellow-500/40 text-yellow-300 text-sm p-4 rounded mb-5 text-center">
            <p className="font-bold mb-1">⚠️ Supabase غير مربوط</p>
            <p className="text-xs text-yellow-300/70">
              خاصك تزيد NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY فـ .env.local باش يخدم التسجيل
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-bold mb-1">الإيميل</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 text-sm outline-none focus:border-brand-gold placeholder:text-white/30"
              placeholder="admin@yuriva.ma"
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm font-bold mb-1">كلمة السر</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 text-sm outline-none focus:border-brand-gold placeholder:text-white/30"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !hasSupabase}
            className="w-full bg-brand-gold text-white font-bold py-3 hover:bg-opacity-85 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "جاري التسجيل..." : "دخل"}
          </button>
        </form>
      </div>
    </div>
  );
}
