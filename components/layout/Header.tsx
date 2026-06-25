"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingCart, Menu, Search, X, MessageCircle } from "lucide-react";
import { useCart } from "./CartContext";
import MobileMenu from "./MobileMenu";
import { searchProducts as searchLocal } from "@/data/products";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";

// ── Style helpers ──────────────────────────────────────────────────────────
export interface LayoutStyle {
  bgColor?: string;
  bgImage?: string;
  textColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

const NAVY   = "#05051F";
const WHITE  = "#FFFFFF";

/** Return hex color only if it looks valid */
function validHex(c?: string): string | undefined {
  return /^#[0-9A-Fa-f]{3,8}$/.test(c || "") ? c : undefined;
}

/** Convert hex + alpha (0-1) to rgba string */
function rgba(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Nav links ─────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "سراول Para", href: "/collections/pantalons-para" },
  { label: "Shorts Para", href: "/collections/shorts-para" },
  { label: "Cargo", href: "/collections/cargo" },
  { label: "باكات", href: "/collections/packs" },
  { label: "العروض", href: "/collections/offers" },
  { label: "الأكثر مبيعاً", href: "/collections/best-sellers" },
];

interface HeaderProps {
  headerStyle?: LayoutStyle;
}

export default function Header({ headerStyle }: HeaderProps) {
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const r = searchLocal(query).slice(0, 5);
    setResults(r);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Compute inline styles ────────────────────────────────────────────────
  const bgColor  = validHex(headerStyle?.bgColor)  || NAVY;
  const textColor = validHex(headerStyle?.textColor) || WHITE;
  const bgImg    = headerStyle?.bgImage || "";
  const logoUrl  = headerStyle?.logoUrl || "";

  const headerInlineStyle: React.CSSProperties = bgImg
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)), url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: bgColor,
        color: textColor,
      }
    : { backgroundColor: bgColor, color: textColor };

  const navLinkStyle: React.CSSProperties = { color: rgba(textColor, 0.85) };

  return (
    <>
      <header
        className={`sticky top-0 z-30 transition-shadow duration-200 ${
          scrolled ? "shadow-lg" : ""
        }`}
        style={headerInlineStyle}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-16 gap-3">
            {/* Burger */}
            <button
              className="lg:hidden p-2 hover:text-brand-gold transition-colors"
              onClick={() => setMenuOpen(true)}
              aria-label="القائمة"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex-shrink-0 hover:opacity-85 transition-opacity"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="YURIVA"
                  className="h-9 w-auto object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span className="text-2xl font-black tracking-widest hover:text-brand-gold transition-colors">
                  YURIVA
                </span>
              )}
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium hover:text-brand-gold transition-colors whitespace-nowrap"
                  style={navLinkStyle}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right icons */}
            <div className="flex items-center gap-1 mr-auto lg:mr-0">
              {/* Search */}
              <div ref={searchRef} className="relative">
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 hover:text-brand-gold transition-colors"
                  aria-label="البحث"
                >
                  {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                </button>

                {searchOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white shadow-xl border border-gray-100 z-50 rounded-sm">
                    <div className="p-3 border-b border-gray-100">
                      <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ابحث عن سروال، شورت، cargo..."
                        className="w-full text-brand-navy text-sm outline-none bg-brand-light px-3 py-2 rounded-sm"
                        dir="auto"
                      />
                    </div>
                    {results.length > 0 && (
                      <ul className="max-h-64 overflow-y-auto">
                        {results.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/products/${p.slug}`}
                              onClick={() => { setSearchOpen(false); setQuery(""); }}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-brand-light text-brand-navy"
                            >
                              <div>
                                <p className="text-sm font-medium">{p.title}</p>
                                <p className="text-xs text-brand-gold font-bold">{formatPrice(p.price)}</p>
                              </div>
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link
                            href={`/products?q=${encodeURIComponent(query)}`}
                            onClick={() => { setSearchOpen(false); setQuery(""); }}
                            className="block px-3 py-2 text-sm text-brand-gold font-bold text-center border-t border-gray-100 hover:bg-brand-light"
                          >
                            شوف جميع النتائج
                          </Link>
                        </li>
                      </ul>
                    )}
                    {query.length >= 2 && results.length === 0 && (
                      <p className="px-3 py-4 text-sm text-brand-gray text-center">
                        ما لقيناش نتائج لـ &quot;{query}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* WhatsApp icon */}
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "212600000000"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:text-brand-gold transition-colors hidden sm:block"
                aria-label="واتساب"
              >
                <MessageCircle className="h-5 w-5" />
              </a>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 hover:text-brand-gold transition-colors"
                aria-label="سلة التسوق"
              >
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 bg-brand-gold text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
