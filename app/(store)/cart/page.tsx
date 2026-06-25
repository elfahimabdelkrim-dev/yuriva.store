import type { Metadata } from "next";
import CartPageClient from "./CartPageClient";

export const metadata: Metadata = {
  title: "سلة التسوق | YURIVA",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageClient />;
}
