import type { Metadata } from "next";
import { Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { Toaster } from "react-hot-toast";
import TrackingPixels from "./TrackingPixels";
import PageViewTracker from "./PageViewTracker";
import { Suspense } from "react";

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.seo.defaultTitle,
    template: `%s | YURIVA`,
  },
  description: siteConfig.seo.defaultDescription,
  keywords: siteConfig.seo.keywords,
  authors: [{ name: "YURIVA" }],
  creator: "YURIVA",
  publisher: "YURIVA",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "ar_MA",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    images: [
      {
        url: `${siteConfig.url}/images/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "YURIVA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    images: [`${siteConfig.url}/images/og-default.jpg`],
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

/**
 * Fetches active Meta pixel IDs from the DB (tracking_pixels table).
 * Falls back to NEXT_PUBLIC_ env vars when DB is not configured or returns 0 rows.
 * Results are NOT cached — each request gets fresh data so admin changes
 * take effect on the next page load without a rebuild.
 */
async function getActiveMetaPixelIds(): Promise<string[]> {
  const envFallback = [
    process.env.NEXT_PUBLIC_META_PIXEL_ID,
    process.env.NEXT_PUBLIC_META_PIXEL_ID_2,
  ].filter(Boolean) as string[];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return envFallback;

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("tracking_pixels")
      .select("pixel_id")
      .eq("provider", "meta")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) return envFallback;

    const ids = data.map((r: { pixel_id: string }) => r.pixel_id).filter(Boolean);
    return ids.length > 0 ? ids : envFallback;
  } catch {
    return envFallback;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const metaPixelIds  = await getActiveMetaPixelIds();
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const gaId          = process.env.NEXT_PUBLIC_GA_ID;
  const gtmId         = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="ar" dir="rtl" className={notoKufi.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#05051f" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="font-arabic antialiased">
        <TrackingPixels
          pixelIds={metaPixelIds}
          tiktokPixelId={tiktokPixelId}
          gaId={gaId}
          gtmId={gtmId}
        />
        {/* PageViewTracker fires fbq PageView on every route change */}
        {metaPixelIds.length > 0 && (
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
        )}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#05051F",
              color: "#fff",
              fontFamily: "var(--font-noto-arabic), system-ui",
              direction: "rtl",
            },
            success: {
              iconTheme: { primary: "#C9A84C", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
