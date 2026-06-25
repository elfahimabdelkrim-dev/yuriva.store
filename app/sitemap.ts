import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { staticProducts } from "@/data/products";
import { staticCategories } from "@/data/categories";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const staticPages = [
    { url: base, lastModified: now, changeFrequency: "daily" as const, priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${base}/cart`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/track-order`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${base}/pages/about`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${base}/pages/contact`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${base}/pages/how-to-order`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${base}/pages/size-guide`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${base}/pages/delivery-exchange`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${base}/pages/return-policy`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${base}/pages/privacy-policy`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/pages/terms`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/pages/faq`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
  ];

  const categoryPages = staticCategories
    .filter((c) => c.is_active)
    .map((c) => ({
      url: `${base}/collections/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const productPages = staticProducts
    .filter((p) => p.is_active)
    .map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

  return [...staticPages, ...categoryPages, ...productPages];
}
