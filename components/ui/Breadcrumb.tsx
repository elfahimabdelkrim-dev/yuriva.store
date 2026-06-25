import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className={cn("flex items-center gap-1 text-sm text-brand-gray flex-wrap", className)}>
      <Link href="/" className="hover:text-brand-gold transition-colors">
        الرئيسية
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronLeft className="h-3 w-3 rotate-180" />
          {item.href ? (
            <Link href={item.href} className="hover:text-brand-gold transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-brand-navy font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
