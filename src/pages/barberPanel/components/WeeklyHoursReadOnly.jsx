// src/pages/barberPanel/components/WeeklyHoursReadOnly.jsx
import { DAYS, getTodayKey, formatRange } from "../utils/weeklyHoursUX";

// ✅ Fallback لو في مشروعك لسا بيستخدم formatRangeArabic
import { formatRangeArabic as _formatRangeArabic } from "../utils/weeklyHoursUX";

function Badge({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "danger"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : tone === "info"
          ? "bg-sky-50 text-sky-800 border-sky-200"
          : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-black border ${cls}`}
    >
      {children}
    </span>
  );
}

function DayRow({ dayName, isToday, rightText, open }) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white",
        isToday ? "ring-1 ring-slate-200 bg-slate-50" : "",
      ].join(" ")}
    >
      <div className="px-4 py-4">
        {/* ✅ 3-column grid ثابت للموبايل */}
        <div className="grid grid-cols-[auto,auto,1fr] items-center gap-3">
          {/* Day name (right in RTL) */}
          <div className="text-base font-black text-slate-900 whitespace-nowrap">
            {dayName}
          </div>

          {/* Chips (fixed width-ish) */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            {isToday ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black border bg-sky-50 text-sky-800 border-sky-200">
                اليوم
              </span>
            ) : null}

            <span
              className={[
                "px-2.5 py-1 rounded-full text-xs font-black border",
                open
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200",
              ].join(" ")}
            >
              {open ? "مفتوح" : "مغلق"}
            </span>
          </div>

          {/* Time (takes remaining space, no ugly wrap) */}
          <div className="text-sm font-black text-slate-800 text-left truncate tabular-nums">
            {rightText}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyHoursReadOnly({
  weekly,
  loading,
  showHeader = true,
  updatedText,
  onEdit,
  onResetToDefault,
  // ✅ اختياري (لا يكسر شي لو ما انبعت)
  isArabic = true,
}) {
  const todayKey = getTodayKey();
  const todayDay = DAYS.find((d) => d.key === todayKey);
  const todayValue = weekly?.[todayKey] ?? null;

  // ✅ استخدم formatRange الجديد لو موجود، وإلا fallback للعربي القديم
  const rangeText = (v) => {
    try {
      if (typeof formatRange === "function") return formatRange(v, isArabic);
      return _formatRangeArabic(v);
    } catch {
      return _formatRangeArabic(v);
    }
  };

  const headerSubtitle = updatedText
    ? isArabic
      ? `آخر تعديل: ${updatedText}`
      : `Last edit: ${updatedText}`
    : isArabic
      ? "عدّل ساعات وأيام العمل بشكل واضح ومقصود."
      : "Set your weekly schedule clearly and intentionally.";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {showHeader ? (
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-black text-slate-900">
              {isArabic ? "ساعات العمل الأسبوعية" : "Weekly working hours"}
            </div>
            <div className="text-xs font-black text-slate-500 mt-1">
              {headerSubtitle}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onResetToDefault ? (
              <button
                onClick={onResetToDefault}
                className="px-4 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-black transition"
              >
                {isArabic ? "افتراضي" : "Default"}
              </button>
            ) : null}

            {onEdit ? (
              <button
                onClick={onEdit}
                className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black transition"
              >
                {isArabic ? "تعديل" : "Edit"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="p-4 bg-white">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-600">
            {isArabic ? "جاري التحميل..." : "Loading…"}
          </div>
        ) : (
          <>
            {/* ✅ Today Summary */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {isArabic ? "ملخص اليوم" : "Today summary"}
                  </div>
                  <div className="text-xs font-black text-slate-600 mt-1">
                    {isArabic
                      ? `${todayDay?.ar ?? "اليوم"} • ${rangeText(todayValue)}`
                      : `${todayDay?.en ?? "Today"} • ${rangeText(todayValue)}`}
                  </div>
                </div>

                <Badge tone={todayValue ? "success" : "danger"}>
                  {todayValue
                    ? isArabic
                      ? "مفتوح اليوم"
                      : "Open today"
                    : isArabic
                      ? "مغلق اليوم"
                      : "Closed today"}
                </Badge>
              </div>
            </div>

            {/* Days list */}
            <div className="space-y-2">
              {DAYS.map((d) => {
                const v = weekly?.[d.key] ?? null;
                const isToday = d.key === todayKey;
                return (
                  <DayRow
                    key={d.key}
                    dayName={d.ar}
                    isToday={isToday}
                    rightText={rangeText(v)}
                    open={!!v}
                  />
                );
              })}
            </div>
          </>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-black text-slate-700 leading-5">
            ℹ️{" "}
            {isArabic
              ? "التغييرات تؤثر فقط على الحجوزات الجديدة. الحجوزات المؤكدة لا تتغير."
              : "Changes affect new bookings only. Confirmed bookings do not change."}
          </div>
        </div>
      </div>
    </div>
  );
}
