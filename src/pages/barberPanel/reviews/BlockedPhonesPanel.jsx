// src/pages/barberPanel/reviews/BlockedPhonesPanel.jsx
export default function BlockedPhonesPanel({ blocked, loading, onUnblock }) {
  if (loading && (!blocked || blocked.length === 0)) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
        جارٍ تحميل الأرقام...
      </div>
    );
  }

  if (!blocked || blocked.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm text-gray-600">
        لا يوجد أرقام محظورة.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="text-right font-extrabold text-gray-900 mb-3">
        قائمة الأرقام المحظورة
      </div>

      <div className="divide-y">
        {blocked.map((b) => (
          <div
            key={b.id}
            className="py-3 flex items-center justify-between gap-3"
          >
            <div className="text-right">
              <div className="font-black text-gray-900">
                {b.phoneKey || b.id}
              </div>
              <div className="text-xs text-gray-500">
                {b.from ? `المصدر: ${b.from}` : ""}{" "}
                {b.fromBarberId ? ` • ${b.fromBarberId}` : ""}
              </div>
            </div>

            <button
              onClick={() => onUnblock(b.phoneKey || b.id)}
              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-sm"
            >
              إلغاء الحظر
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
