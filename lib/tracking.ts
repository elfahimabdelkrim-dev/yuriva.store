"use client";
import type { TrackingSettings, CartItem } from "@/types";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackPageView(settings: TrackingSettings) {
  if (settings.meta_pixel_enabled && settings.meta_pixel_id) {
    window.fbq?.("track", "PageView");
  }
  if (settings.tiktok_pixel_enabled && settings.tiktok_pixel_id) {
    window.ttq?.track("ViewContent");
  }
  if (settings.google_analytics_enabled && settings.google_analytics_id) {
    window.gtag?.("event", "page_view");
  }
}

export function trackViewContent(
  settings: TrackingSettings,
  productId: string,
  productName: string,
  price: number
) {
  if (settings.meta_pixel_enabled && settings.meta_pixel_id) {
    window.fbq?.("track", "ViewContent", {
      content_ids: [productId],
      content_name: productName,
      content_type: "product",
      value: price,
      currency: "MAD",
    });
  }
  if (settings.tiktok_pixel_enabled) {
    window.ttq?.track("ViewContent", {
      content_id: productId,
      content_name: productName,
      price,
      currency: "MAD",
    });
  }
}

export function trackAddToCart(
  settings: TrackingSettings,
  item: CartItem
) {
  if (settings.meta_pixel_enabled && settings.meta_pixel_id) {
    window.fbq?.("track", "AddToCart", {
      content_ids: [item.product_id],
      content_name: item.product_title,
      content_type: "product",
      value: item.price,
      currency: "MAD",
    });
  }
  if (settings.tiktok_pixel_enabled) {
    window.ttq?.track("AddToCart", {
      content_id: item.product_id,
      price: item.price,
      currency: "MAD",
    });
  }
  if (settings.google_analytics_enabled) {
    window.gtag?.("event", "add_to_cart", {
      currency: "MAD",
      value: item.price,
      items: [{ item_id: item.product_id, item_name: item.product_title, price: item.price }],
    });
  }
}

export function trackInitiateCheckout(
  settings: TrackingSettings,
  items: CartItem[],
  total: number
) {
  if (settings.meta_pixel_enabled && settings.meta_pixel_id) {
    window.fbq?.("track", "InitiateCheckout", {
      content_ids: items.map((i) => i.product_id),
      num_items: items.length,
      value: total,
      currency: "MAD",
    });
  }
  if (settings.tiktok_pixel_enabled) {
    window.ttq?.track("InitiateCheckout", { value: total, currency: "MAD" });
  }
}

export function trackLead(
  settings: TrackingSettings,
  total: number
) {
  if (settings.meta_pixel_enabled && settings.meta_pixel_id) {
    window.fbq?.("track", "Lead", { value: total, currency: "MAD" });
  }
  if (settings.tiktok_pixel_enabled) {
    window.ttq?.track("PlaceAnOrder", { value: total, currency: "MAD" });
  }
  if (settings.google_analytics_enabled) {
    window.gtag?.("event", "generate_lead", { currency: "MAD", value: total });
  }
}

export function trackSearch(settings: TrackingSettings, query: string) {
  if (settings.meta_pixel_enabled && settings.meta_pixel_id) {
    window.fbq?.("track", "Search", { search_string: query });
  }
  if (settings.google_analytics_enabled) {
    window.gtag?.("event", "search", { search_term: query });
  }
}

export function initializePixels(settings: TrackingSettings) {
  if (typeof window === "undefined") return;
  // Pixels initialized via Script tags in layout — this just triggers events
}
