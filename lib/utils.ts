import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `${price} درهم`;
}

export function formatDiscount(price: number, oldPrice: number): number {
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function validateMoroccanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  const patterns = [
    /^0[67]\d{8}$/,
    /^\+212[67]\d{8}$/,
    /^212[67]\d{8}$/,
    /^00212[67]\d{8}$/,
  ];
  return patterns.some((p) => p.test(cleaned));
}

export function normalizeMoroccanPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+212")) return "0" + cleaned.slice(4);
  if (cleaned.startsWith("00212")) return "0" + cleaned.slice(5);
  if (cleaned.startsWith("212")) return "0" + cleaned.slice(3);
  return cleaned;
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}

// ─── Category-based fallback titles (Darija) ───────────────────────
const CATEGORY_FALLBACK_TITLES: Record<string, string> = {
  "pantalons-para": "سروال Para رجالي",
  "shorts-para":    "Short Para رجالي",
  cargo:            "سروال Cargo رجالي",
  packs:            "باك ملابس رجالية",
  offers:           "منتج بعرض خاص",
  "new-arrivals":   "منتج جديد",
};

// Short or test-looking strings that are not real product titles
const BAD_TITLE_PATTERN = /^[a-z0-9]{1,6}$|^test|^mock|^sample|^product\s*\d*$/i;

/**
 * Return a clean product title for public display.
 * Rejects single letters, short random strings (< 4 chars), or test names.
 */
export function sanitizeProductTitle(
  title: string,
  categoryId?: string,
  fallback = "منتج YURIVA"
): string {
  const trimmed = (title || "").trim();
  const isBad =
    trimmed.length < 4 ||
    BAD_TITLE_PATTERN.test(trimmed) ||
    /^[a-z]{1,3}$/i.test(trimmed);

  if (isBad) {
    return (categoryId && CATEGORY_FALLBACK_TITLES[categoryId]) || fallback;
  }
  return trimmed;
}

export function getUTMParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
  };
}
