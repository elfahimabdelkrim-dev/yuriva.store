"use client";
/**
 * PageViewTracker — fires exactly ONE fbq PageView per navigation.
 *
 * Owns all PageViews (initial load + SPA route changes).
 * TrackingPixels.tsx only calls fbq("init") — no PageView there.
 *
 * Usage: render inside <Suspense> in layout.tsx (required by usePathname).
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
      console.log("[Meta Pixel] PageView fired:", pathname);
    } else {
      console.warn("[Meta Pixel] PageView NOT fired — fbq not ready:", pathname);
    }
  // pathname is the only dependency — fires on every route change + initial mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
