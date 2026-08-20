import { e164ToLocalPretty } from "../../../utils/phone";

function clampStars(value) {
  return Math.max(0, Math.min(5, Number(value || 0)));
}

function starsLabel(value) {
  const stars = clampStars(value);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

function toDateSafe(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatReviewDate(value) {
  const date = toDateSafe(value);

  if (!date) return "";

  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return `اليوم ${date.toLocaleTimeString("ar", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString("ar", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export default function ReviewCard({
  r,
  expanded,
  onToggle,
  isBlocked,
  onArchive,
  onBlock,
  onUnblock,
}) {
  const id = r.id;

  const name =
    String(r.customerName || r.userName || r.displayName || "").trim() ||
    "زبون";

  const phoneKey = String(
    r.phoneKey || r.phone || r.phoneNumber || "",
  ).trim();

  const phoneLabel = phoneKey
    ? e164ToLocalPretty(phoneKey) || phoneKey
    : "";

  const rating = clampStars(r.rating ?? r.stars ?? 0);

  const message = String(
    r.message || r.text || r.comment || "",
  ).trim();

  const dateLabel = formatReviewDate(r.createdAt);

  return (
    <article
      className={[
        "rounded-2xl border bg-white shadow-sm transition",
        expanded ? "border-gray-300" : "border-gray-200",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="
          flex w-full items-center justify-between
          gap-3 px-3 py-3 text-right
          transition hover:bg-gray-50
        "
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-black text-gray-900 sm:text-base">
            {name}
          </span>

          {r.isNew === true ? (
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
              جديد
            </span>
          ) : null}

          {isBlocked ? (
            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black text-rose-700">
              محظور
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className="
              inline-flex items-center
              rounded-full border border-amber-200
              bg-amber-50 px-2.5 py-1
              text-xs font-black tracking-wide text-amber-600
            "
          >
            {starsLabel(rating)}
          </span>

          <span className="text-[11px] font-bold text-gray-400">
            {expanded ? "إغلاق" : "فتح"}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-gray-100 px-3 pb-3 pt-3">
          {dateLabel ? (
            <div className="mb-2 text-[10px] font-semibold text-gray-400">
              {dateLabel}
            </div>
          ) : null}

          {message ? (
            <div
              className="
                rounded-xl bg-gray-50
                px-3 py-2.5
                text-sm font-semibold leading-6
                text-gray-700
              "
            >
              {message}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-400">
              الزبون ترك تقييم بدون تعليق.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              {phoneLabel ? (
                <span
                  dir="ltr"
                  className="font-mono text-[11px] font-bold text-gray-500"
                >
                  {phoneLabel}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-gray-400">
                  لا يوجد رقم
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {phoneKey ? (
                <a
                  href={`tel:${phoneKey}`}
                  className="
                    rounded-xl border border-blue-200
                    bg-blue-50 px-3 py-2
                    text-xs font-black text-blue-700
                    transition hover:bg-blue-100
                  "
                >
                  اتصال
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => onArchive(id)}
                className="
                  rounded-xl border border-gray-200
                  bg-white px-3 py-2
                  text-xs font-black text-gray-600
                  transition hover:bg-gray-50
                "
              >
                إخفاء التقييم
              </button>

              {phoneKey ? (
                isBlocked ? (
                  <button
                    type="button"
                    onClick={() => onUnblock(phoneKey)}
                    className="
                      rounded-xl border border-emerald-200
                      bg-emerald-50 px-3 py-2
                      text-xs font-black text-emerald-700
                      transition hover:bg-emerald-100
                    "
                  >
                    فك الحظر
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBlock(phoneKey, id)}
                    className="
                      rounded-xl border border-rose-200
                      bg-rose-50 px-3 py-2
                      text-xs font-black text-rose-700
                      transition hover:bg-rose-100
                    "
                  >
                    حظر الزبون
                  </button>
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
