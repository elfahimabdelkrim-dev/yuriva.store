import type { Metadata } from "next";
import TrackOrderClient from "./TrackOrderClient";

export const metadata: Metadata = {
  title: "تتبع الطلب | YURIVA",
  description: "تتبع طلبك من متجر YURIVA بإدخال رقم هاتفك",
};

export default function TrackOrderPage() {
  return <TrackOrderClient />;
}
