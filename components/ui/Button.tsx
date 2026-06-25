import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gold" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "primary", size = "md", loading, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed",
          variant === "primary" && "bg-brand-navy text-white hover:bg-opacity-85",
          variant === "secondary" && "border border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white",
          variant === "gold" && "bg-brand-gold text-white hover:bg-opacity-85",
          variant === "ghost" && "text-brand-navy hover:bg-gray-100",
          size === "sm" && "px-3 py-1.5 text-sm",
          size === "md" && "px-5 py-3 text-sm",
          size === "lg" && "px-7 py-4 text-base",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
            جاري التحميل...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
export default Button;
