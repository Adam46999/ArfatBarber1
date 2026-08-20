import { useState } from "react";
import ReviewCard from "./ReviewCard";

export default function ReviewsList({
  items,
  loading,
  hasMore,
  onLoadMore,
  blockedSet,
  onArchive,
  onBlock,
  onUnblock,
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading && (!items || items.length === 0)) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="
              h-20 animate-pulse
              rounded-2xl border border-slate-200
              bg-white
            "
          />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div
        className="
          rounded-2xl border border-slate-200
          bg-white p-6 text-center shadow-sm
        "
      >
        <div className="text-sm font-black text-slate-700">
          ما في تقييمات مطابقة
        </div>

        <div className="mt-1 text-xs font-semibold text-slate-400">
          جرّب تغيّر البحث أو الفلتر.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((review) => {
        const phoneKey = String(
          review.phoneKey || review.phone || review.phoneNumber || "",
        );

        return (
          <ReviewCard
            key={review.id}
            r={review}
            expanded={expandedId === review.id}
            onToggle={() =>
              setExpandedId((current) =>
                current === review.id ? null : review.id,
              )
            }
            isBlocked={blockedSet?.has(phoneKey)}
            onArchive={onArchive}
            onBlock={onBlock}
            onUnblock={onUnblock}
          />
        );
      })}

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="
            w-full rounded-xl border border-slate-200
            bg-white px-4 py-2.5
            text-xs font-black text-slate-600
            transition hover:bg-slate-50
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {loading ? "جارٍ التحميل..." : "تحميل تقييمات أقدم"}
        </button>
      ) : null}
    </div>
  );
}
