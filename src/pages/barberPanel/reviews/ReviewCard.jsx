// src/pages/barberPanel/reviews/ReviewCard.jsx
function starsLabel(n) {
  const v = Math.max(0, Math.min(5, Number(n || 0)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

function prettyName(name) {
  const s = String(name || "").trim();
  if (!s) return "زبون";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0] || "";
  return `${first} ${lastInitial}.`;
}

export default function ReviewCard({
  r,
  isBlocked,
  onArchive,
  onBlock,
  onUnblock,
}) {
  const id = r.id;
  const name = prettyName(r.customerName || r.userName || r.displayName);
  const phoneKey = r.phoneKey || r.phone || r.phoneNumber || "";
  const rating = Number(r.rating ?? r.stars ?? 0);
  const msg = (r.message || r.text || r.comment || "").trim();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-right">
          <div className="font-extrabold text-gray-900">{name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {phoneKey ? `رقم: ${phoneKey}` : "بدون رقم"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-black text-gray-900">
            {starsLabel(rating)}
          </div>
          <div className="text-xs text-gray-500">({rating || 0}/5)</div>
        </div>
      </div>

      {msg ? (
        <div className="mt-3 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 text-right">
          {msg}
        </div>
      ) : (
        <div className="mt-3 text-sm text-gray-400 text-right">بدون تعليق</div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        <button
          onClick={() => onArchive(id)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-extrabold text-sm"
        >
          أرشفة
        </button>

        {phoneKey ? (
          isBlocked ? (
            <button
              onClick={() => onUnblock(phoneKey)}
              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-sm"
            >
              إلغاء الحظر
            </button>
          ) : (
            <button
              onClick={() => onBlock(phoneKey, id)}
              className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 font-extrabold text-sm"
            >
              حظر الرقم
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
