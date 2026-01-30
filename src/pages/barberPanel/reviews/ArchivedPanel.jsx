// src/pages/barberPanel/reviews/ArchivedPanel.jsx
function starsLabel(n) {
  const v = Math.max(0, Math.min(5, Number(n || 0)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

export default function ArchivedPanel({
  items,
  loading,
  onRestore,
  onDeleteForever,
}) {
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
        جارٍ تحميل الأرشيف...
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm text-gray-600">
        لا يوجد تقييمات مؤرشفة.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div
          key={r.id}
          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-right">
              <div className="font-extrabold text-gray-900">
                {r.customerName || r.userName || r.displayName || "زبون"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {r.phoneKey ? `رقم: ${r.phoneKey}` : "بدون رقم"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black text-gray-900">
                {starsLabel(r.rating ?? r.stars ?? 0)}
              </div>
              <div className="text-xs text-gray-500">مؤرشف</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => onRestore(r.id)}
              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-sm"
            >
              استرجاع
            </button>

            <button
              onClick={() => onDeleteForever(r.id)}
              className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 font-extrabold text-sm"
            >
              حذف نهائي
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
