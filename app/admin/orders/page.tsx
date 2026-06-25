import type { Metadata } from "next";
import AdminOrdersClient from "./AdminOrdersClient";

export const metadata: Metadata = { title: "الطلبات | YURIVA Admin" };

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
