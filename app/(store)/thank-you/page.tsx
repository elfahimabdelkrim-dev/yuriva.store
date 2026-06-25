import type { Metadata } from "next";
import { Suspense } from "react";
import ThankYouClient from "./ThankYouClient";
export const metadata: Metadata = {
  title: "شكراً على طلبك | YURIVA",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">كنحضرو الطلب ديالك...</div>}>
      <ThankYouClient />
    </Suspense>
  );
}