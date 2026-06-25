"use client";
import type { ProductColor, PackColorChoice } from "@/types";

interface PackColorSelectorProps {
  pieces: number;
  colors: ProductColor[];
  selected: (ProductColor | null)[];
  onChange: (pieceIndex: number, color: ProductColor) => void;
  error?: string;
}

export default function PackColorSelector({
  pieces,
  colors,
  selected,
  onChange,
  error,
}: PackColorSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="font-bold text-brand-navy text-sm">اختار لون كل قطعة:</p>
      {Array.from({ length: pieces }).map((_, i) => (
        <div key={i} className="border border-gray-200 p-3 rounded-sm">
          <p className="text-xs font-bold text-brand-gray mb-2">
            القطعة {i + 1}{selected[i] ? ` — ${selected[i]!.label}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => onChange(i, color)}
                title={color.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium transition-all rounded-sm ${
                  selected[i]?.name === color.name
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-gray-300 text-brand-navy hover:border-brand-navy"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                {color.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
