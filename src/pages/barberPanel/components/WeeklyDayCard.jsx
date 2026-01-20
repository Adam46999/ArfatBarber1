// src/pages/barberPanel/components/WeeklyDayCard.jsx
export default function WeeklyDayCard({
  day,
  isArabic,
  value,
  error,
  expanded,
  onExpand,
  onToggleOpen,
  onChange,
}) {
  const open = value !== null;
  const title = isArabic ? day.ar : day.en;

  const timeText = !open
    ? isArabic
      ? "مغلق طوال اليوم"
      : "Closed all day"
    : isArabic
      ? `من ${value.from} إلى ${value.to}`
      : `${value.from} → ${value.to}`;

  return (
    <div
      className={[
        "rounded-2xl border bg-white shadow-sm overflow-hidden",
        error ? "border-rose-300" : "border-slate-200",
      ].join(" ")}
    >
      {/* Row */}
      <button
        type="button"
        onClick={onExpand}
        className="w-full px-4 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <span
            className={[
              "w-2.5 h-2.5 rounded-full",
              open ? "bg-emerald-500" : "bg-rose-500",
            ].join(" ")}
          />
          <div className="flex flex-col items-start">
            <div className="text-base font-black text-slate-900">{title}</div>
            <div className="text-sm font-bold text-slate-700 mt-1">
              {timeText}
            </div>
            {error ? (
              <div className="text-xs font-black text-rose-700 mt-1">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!open ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-black border bg-slate-100 text-slate-700 border-slate-200">
              {isArabic ? "مغلق" : "Closed"}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-black border bg-emerald-50 text-emerald-800 border-emerald-200">
              {isArabic ? "مفتوح" : "Open"}
            </span>
          )}
          <span className="text-slate-400 font-black text-lg leading-none">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Expand */}
      {expanded ? (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
              <input
                type="checkbox"
                checked={open}
                onChange={(e) => onToggleOpen(e.target.checked)}
              />
              {isArabic ? "مفتوح" : "Open"}
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-black text-slate-600 mb-1">
                {isArabic ? "من" : "From"}
              </div>
              <input
                type="time"
                step="1800"
                disabled={!open}
                value={open ? value.from : ""}
                onChange={(e) => onChange({ from: e.target.value })}
                className={[
                  "w-full px-3 py-3 rounded-2xl border text-base font-black",
                  !open
                    ? "bg-slate-100 border-slate-200 text-slate-400"
                    : error
                      ? "bg-white border-rose-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-900",
                ].join(" ")}
              />
            </div>

            <div>
              <div className="text-xs font-black text-slate-600 mb-1">
                {isArabic ? "إلى" : "To"}
              </div>
              <input
                type="time"
                step="1800"
                disabled={!open}
                value={open ? value.to : ""}
                onChange={(e) => onChange({ to: e.target.value })}
                className={[
                  "w-full px-3 py-3 rounded-2xl border text-base font-black",
                  !open
                    ? "bg-slate-100 border-slate-200 text-slate-400"
                    : error
                      ? "bg-white border-rose-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-900",
                ].join(" ")}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
