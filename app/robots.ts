import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout", "/thank-you", "/cart"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
