"use client";
// Fires fbq ViewContent once when the product page mounts.
// This is a client component rendered inside the server product page.
import { useEffect } from "react";
import { fbqViewContent } from "@/lib/meta-pixel";

interface Props {
  productId: string;
  productTitle: string;
  productPrice: number;
}

export default function ProductViewContent({ productId, productTitle, productPrice }: Props) {
  useEffect(() => {
    fbqViewContent({ id: productId, title: productTitle, price: productPrice });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
