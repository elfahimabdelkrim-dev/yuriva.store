import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export default function StarRating({ rating, max = 5, size = "sm", className }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5",
            i < rating ? "fill-brand-gold text-brand-gold" : "fill-gray-200 text-gray-200"
          )}
        />
      ))}
    </div>
  );
}
