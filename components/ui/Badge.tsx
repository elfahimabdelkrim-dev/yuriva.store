import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "navy" | "gray";
  className?: string;
}

export default function Badge({ children, variant = "gold", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-bold px-2 py-0.5 rounded-sm",
        variant === "gold" && "bg-brand-gold text-white",
        variant === "navy" && "bg-brand-navy text-white",
        variant === "gray" && "bg-gray-200 text-brand-gray",
        className
      )}
    >
      {children}
    </span>
  );
}
