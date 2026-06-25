"use client";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

const FALLBACK_MESSAGES = [
  "عرض محدود اليوم فقط",
  "توصيل مجاني داخل المغرب",
  "الدفع عند الاستلام",
];

interface PromoBarProps {
  text?: string;
  bgColor?: string;
  textColor?: string;
  linkText?: string;
  linkUrl?: string;
}

export default function PromoBar({
  text,
  bgColor = "#05051F",
  textColor = "#FFFFFF",
  linkText,
  linkUrl,
}: PromoBarProps) {
  const [visible, setVisible] = useState(true);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  // Split announcement_text by "|" into separate messages
  const messages =
    text && text.trim().length > 0
      ? text.split("|").map((m) => m.trim()).filter(Boolean)
      : FALLBACK_MESSAGES;

  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      // Start fade out
      setFading(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setFading(false);
      }, 300); // 300ms crossfade
    }, 3000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  if (!visible) return null;

  const barStyle: React.CSSProperties = {
    backgroundColor: bgColor || "#05051F",
    color: textColor || "#FFFFFF",
  };

  const msgStyle: React.CSSProperties = {
    opacity: fading ? 0 : 1,
    transition: "opacity 0.3s ease",
  };

  return (
    <div className="text-xs md:text-sm py-2 px-4 relative" style={barStyle}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 min-h-[1.25rem]">
        <p className="text-center font-medium leading-tight" style={msgStyle}>
          {messages[index]}
          {linkText && linkUrl && (
            <Link
              href={linkUrl}
              className="mr-2 underline font-bold hover:no-underline"
              style={{ color: textColor || "#FFFFFF" }}
            >
              {linkText} ←
            </Link>
          )}
        </p>
        <button
          onClick={() => setVisible(false)}
          className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: textColor || "#FFFFFF" }}
          aria-label="إخفاء الشريط"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
