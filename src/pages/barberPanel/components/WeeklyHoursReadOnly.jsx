// src/pages/barberPanel/components/WeeklyHoursReadOnly.jsx
import { DAYS, formatRangeArabic, getTodayKey } from "../utils/weeklyHoursUX";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-black border bg-slate-100 text-slate-700 border-slate-200">
      {children}
    </span>
  );
}

function DayRow({ dayName, isToday, rightText, closedAllDay }) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border",
        "border-slate-200 bg-white",
        isToday ? "ring-1 ring-slate-200 bg-slate-50" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {isToday ? (
          <span className="w-1.5 h-8 rounded-full bg-slate-900" />
        ) : (
          <span className="w-1.5 h-8 rounded-full bg-transparent" />
        )}

        <div className="text-base font-black text-slate-900">{dayName}</div>

        {isToday ? <Badge>اليوم</Badge> : null}
      </div>

      <div className="flex items-center gap-2">
        {closedAllDay ? <Badge>مغلق</Badge> : null}
        <div className="text-sm font-black text-slate-800">{rightText}</div>
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
}) {
  const todayKey = getTodayKey();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {showHeader ? (
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-black text-slate-900">
              ساعات العمل الأسبوعية
            </div>
            <div className="text-xs font-black text-slate-500 mt-1">
              {updatedText
                ? updatedText
                : "عدّل ساعات وأيام العمل بشكل واضح ومقصود."}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onResetToDefault ? (
              <button
                onClick={onResetToDefault}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-black transition"
              >
                افتراضي
              </button>
            ) : null}

            {onEdit ? (
              <button
                onClick={onEdit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition"
              >
                تعديل
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="p-4 bg-white">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-600">
            جاري التحميل...
          </div>
        ) : (
          <div className="space-y-2">
            {DAYS.map((d) => {
              const v = weekly?.[d.key] ?? null;
              const isToday = d.key === todayKey;
              return (
                <DayRow
                  key={d.key}
                  dayName={d.ar}
                  isToday={isToday}
                  rightText={formatRangeArabic(v)}
                  closedAllDay={!v}
                />
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-black text-slate-700 leading-5">
            ℹ️ التغييرات تؤثر فقط على الحجوزات الجديدة. الحجوزات المؤكدة لا
            تتغير.
          </div>
        </div>
      </div>
    </div>
  );
}
