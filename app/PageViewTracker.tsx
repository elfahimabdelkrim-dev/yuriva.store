"use client";
/**
 * PageViewTracker — fires fbq PageView on every client-side route change.
 * Next.js App Router navigates without reloading the page, so the inline
 * <Script> in TrackingPixels only fires once (initial load).
 * This component listens to pathname changes and fires the missing PageViews.
 *
 * Usage: render inside <Suspense> in layout.tsx (required by useSearchParams).
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageViewTracker() {
  const pathname = usePathname();
  const mounted  = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      // Skip the very first mount — TrackingPixels already fired PageView on init.
      mounted.current = true;
      console.log("[Meta Pixel] PageView fired (initial load):", pathname);
      return;
    }
    // Subsequent route changes: fire PageView
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
      console.log("[Meta Pixel] PageView fired (route change):", pathname);
    } else {
      console.warn("[Meta Pixel] PageView NOT fired — fbq not loaded yet:", pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
