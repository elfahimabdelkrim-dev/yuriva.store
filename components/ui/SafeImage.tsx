"use client";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Thin "use client" wrapper so onError can be used safely
 * when this component is imported from a Server Component.
 */
export default function SafeImage({ src, alt, className = "" }: SafeImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
