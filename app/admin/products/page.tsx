import type { Metadata } from "next";
import AdminProductsClient from "@/components/admin/AdminProductsClient";

export const metadata: Metadata = { title: "المنتجات | YURIVA Admin" };

export default function AdminProductsPage() {
  return <AdminProductsClient />;
}
