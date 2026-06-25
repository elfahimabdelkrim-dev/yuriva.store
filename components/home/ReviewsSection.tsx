import StarRating from "@/components/ui/StarRating";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  product_title?: string;
}

interface ReviewsSectionProps {
  reviews: Review[];
}

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  if (reviews.length === 0) return null;

  return (
    <section className="py-12 bg-brand-light">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-brand-navy">آراء الزبناء</h2>
          <div className="h-0.5 w-12 bg-brand-gold mx-auto mt-2" />
          <div className="flex items-center justify-center gap-2 mt-3">
            <StarRating rating={5} size="md" />
            <span className="text-brand-gray text-sm font-medium">4.9/5 من +200 تقييم</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white p-5 shadow-sm border border-gray-100 hover:border-brand-gold transition-colors"
            >
              <StarRating rating={review.rating} className="mb-3" />
              <p className="text-brand-navy text-sm leading-relaxed mb-4 line-clamp-4">
                &quot;{review.review_text}&quot;
              </p>
              <div className="border-t border-gray-100 pt-3">
                <p className="font-bold text-xs text-brand-navy">{review.customer_name}</p>
                {review.product_title && (
                  <p className="text-brand-gray text-xs mt-0.5">{review.product_title}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
