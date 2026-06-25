"use client";
import { staticReviews } from "@/data/settings";
import StarRating from "@/components/ui/StarRating";

export default function AdminReviewsPage() {
  return (
    <div>
      <h1 className="text-2xl font-black text-brand-navy mb-6">التقييمات</h1>
      <div className="space-y-3">
        {staticReviews.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <StarRating rating={r.rating} className="mb-1" />
                <p className="text-sm text-brand-navy">{r.review_text}</p>
                <p className="text-xs text-brand-gray mt-1">{r.customer_name} — {r.product_title}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">نشط</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-brand-gray text-sm mt-4">ربط Supabase لإدارة التقييمات ديناميكياً</p>
    </div>
  );
}
