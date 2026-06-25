# YURIVA — متجر الكتروني

سراول Para، Shorts Para، Cargo pants — رجال وشباب فالمغرب.

## التقنيات

- **Next.js 14** App Router + TypeScript
- **Tailwind CSS** (3 ألوان: Navy/Gold/White)
- **Supabase** (اختياري — الموقع يشتغل بدونه)
- **Daf عند الاستلام** فقط — بدون أداء إلكتروني
- **واتساب** لتأكيد الطلبات

---

## التشغيل السريع

```bash
# 1. نسخ متغيرات البيئة
cp .env.example .env.local
# ← عدل .env.local بمعلوماتك

# 2. تثبيت الحزم
npm install

# 3. تشغيل بيئة التطوير
npm run dev
# ← افتح http://localhost:3000
```

---

## وضعا التشغيل

### 1. وضع Static (بدون Supabase)
يشتغل بدون قاعدة بيانات — المنتجات والإعدادات من `data/` ملفات.  
مناسب للنشر السريع أو الاختبار.

### 2. وضع Supabase (الإنتاج)
أضف متغيرات Supabase في `.env.local` وشغّل schema SQL.

---

## إعداد Supabase

1. أنشئ مشروع على [supabase.com](https://supabase.com)
2. في **SQL Editor**، شغّل `supabase-schema.sql`
3. أضف المتغيرات في `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

---

## إعداد Admin Dashboard

افتح `/admin` في المتصفح.

بدون Supabase: يشتغل بوضع العرض (read-only).  
مع Supabase: أنشئ حساب Admin في Supabase Auth، ثم سجّل الدخول من `/admin/login`.

---

## إعداد Google Sheets (اختياري)

لمزامنة الطلبات تلقائياً مع Google Sheets:

1. أنشئ **Service Account** في Google Cloud Console
2. شارك الـ Sheet مع بريد Service Account
3. أضف في `.env.local`:
   ```
   GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
   GOOGLE_CLIENT_EMAIL=yuriva@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

---

## إعداد Pixels (Meta / TikTok / GA / GTM)

أضف في `.env.local`:
```
NEXT_PUBLIC_META_PIXEL_ID=123456789
NEXT_PUBLIC_TIKTOK_PIXEL_ID=ABCDEFG
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXXX
```

---

## البناء للإنتاج

```bash
npm run build
npm run start
```

---

## النشر على Vercel

```bash
npx vercel --prod
```

أو اربط المشروع مع Vercel من Dashboard وأضف متغيرات البيئة في Settings > Environment Variables.

**مهم:** في Vercel، أضف `GOOGLE_PRIVATE_KEY` كمتغير بيئة عادي — Vercel يتعامل مع newlines تلقائياً.

---

## هيكل المشروع

```
app/
  (store)/          ← الواجهة العامة
    page.tsx        ← الصفحة الرئيسية
    products/[slug] ← صفحة المنتج
    collections/[slug] ← تصنيف
    checkout/       ← إتمام الطلب
    thank-you/      ← شكراً
    track-order/    ← تتبع الطلب
    pages/          ← صفحات ثابتة (about, faq, ...)
  admin/            ← لوحة التحكم
  api/              ← API Routes (server-side)

components/
  home/             ← مكونات الصفحة الرئيسية
  product/          ← مكونات المنتج
  layout/           ← Header, Footer, Cart...
  ui/               ← مكونات مشتركة

data/               ← بيانات ثابتة (fallback)
lib/                ← وظائف مساعدة
types/              ← TypeScript types
```

---

## متغيرات البيئة الكاملة

| المتغير | ضروري | الوصف |
|---------|-------|-------|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ✓ | رقم واتساب بصيغة 212XXXXXXXXX |
| `NEXT_PUBLIC_SUPABASE_URL` | — | URL مشروع Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Anon key من Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role key (server فقط) |
| `NEXT_PUBLIC_META_PIXEL_ID` | — | Meta/Facebook Pixel ID |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | — | TikTok Pixel ID |
| `NEXT_PUBLIC_GA_ID` | — | Google Analytics 4 ID |
| `NEXT_PUBLIC_GTM_ID` | — | Google Tag Manager ID |
| `GOOGLE_SHEET_ID` | — | ID ملف Google Sheets |
| `GOOGLE_CLIENT_EMAIL` | — | بريد Service Account |
| `GOOGLE_PRIVATE_KEY` | — | Private key (server فقط) |

---

## الألوان

| الاسم | Hex | الاستخدام |
|-------|-----|-----------|
| `brand-navy` | `#05051F` | Header، نصوص رئيسية |
| `brand-gold` | `#C9A84C` | CTAs، تمييزات |
| `brand-white` | `#FFFFFF` | خلفيات |
| `brand-light` | `#F8F8F8` | خلفيات ثانوية |
