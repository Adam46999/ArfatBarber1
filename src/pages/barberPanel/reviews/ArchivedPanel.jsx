import { e164ToLocalPretty } from "../../../utils/phone";

function starsLabel(value) {
  const stars = Math.max(0, Math.min(5, Number(value || 0)));

  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export default function ArchivedPanel({
  items,
  loading,
  onRestore,
  onDeleteForever,
}) {
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        جارٍ تحميل التقييمات المخفية...
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-sm font-black text-slate-700">
          ما في تقييمات مخفية
        </div>

        <div className="mt-1 text-xs font-semibold text-slate-400">
          التقييمات اللي بتخفيها رح تظهر هون.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((review) => {
        const name =
          review.customerName ||
          review.userName ||
          review.displayName ||
          "زبون";

        const phoneKey =
          review.phoneKey ||
          review.phone ||
          review.phoneNumber ||
          "";

        const message = String(
          review.message || review.text || review.comment || "",
        ).trim();

        return (
          <article
            key={review.id}
            className="
              rounded-2xl border border-slate-200
              bg-white p-4 shadow-sm
            "
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-black text-slate-900">
                    {name}
                  </h3>

                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">
                    مخفي
                  </span>
                </div>

                {phoneKey ? (
                  <div
                    dir="ltr"
                    className="mt-1 font-mono text-[10px] font-semibold text-slate-400"
                  >
                    {e164ToLocalPretty(phoneKey) || phoneKey}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 text-sm font-black text-amber-500">
                {starsLabel(review.rating ?? review.stars ?? 0)}
              </div>
            </div>

            {message ? (
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold leading-6 text-slate-600">
                {message}
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => onRestore(review.id)}
                className="
                  rounded-xl border border-emerald-200
                  bg-emerald-50 px-3 py-2
                  text-xs font-black text-emerald-700
                  transition hover:bg-emerald-100
                "
              >
                إظهار من جديد
              </button>

              <button
                type="button"
                onClick={() => onDeleteForever(review.id)}
                className="
                  rounded-xl border border-rose-200
                  bg-rose-50 px-3 py-2
                  text-xs font-black text-rose-700
                  transition hover:bg-rose-100
                "
              >
                حذف نهائي
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
