// src/pages/barberPanel/reviews/ReviewsList.jsx
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
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
        جارٍ تحميل التقييمات...
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm text-gray-600">
        لا يوجد تقييمات مطابقة.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <ReviewCard
          key={r.id}
          r={r}
          isBlocked={blockedSet?.has(String(r.phoneKey || ""))}
          onArchive={onArchive}
          onBlock={onBlock}
          onUnblock={onUnblock}
        />
      ))}

      <div className="pt-2">
        {hasMore ? (
          <button
            onClick={onLoadMore}
            disabled={loading}
            className={`w-full rounded-2xl px-4 py-3 font-extrabold border transition
              ${loading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}
              bg-white border-gray-200`}
          >
            {loading ? "جارٍ التحميل..." : "تحميل المزيد"}
          </button>
        ) : (
          <div className="text-center text-xs text-gray-500">
            وصلت للنهاية ✅
          </div>
        )}
      </div>
    </div>
  );
}
