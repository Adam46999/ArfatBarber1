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

  const title =
    isArabic
      ? day.ar
      : day.en || day.key;

  const safeValue = open
    ? {
        from: value?.from ?? "09:00",
        to: value?.to ?? "17:00",
      }
    : null;

  const timeText = open
    ? `${safeValue.from} ? ${safeValue.to}`
    : isArabic
      ? "\u0645\u063a\u0644\u0642"
      : "Closed";

  return (
    <div
      className={[
        "overflow-hidden rounded-[22px] border transition",
        error
          ? "border-rose-300 bg-rose-50/30"
          : expanded
            ? "border-slate-300 bg-white shadow-sm"
            : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onExpand}
        className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-slate-50/80"
      >
        <span
          className={[
            "h-10 w-1 shrink-0 rounded-full",
            open
              ? "bg-emerald-500"
              : "bg-slate-200",
          ].join(" ")}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-black text-slate-950">
              {title}
            </span>

            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-black",
                open
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              {open
                ? isArabic
                  ? "\u0645\u0641\u062a\u0648\u062d"
                  : "Open"
                : isArabic
                  ? "\u0645\u063a\u0644\u0642"
                  : "Closed"}
            </span>
          </div>

          <div
            dir="ltr"
            className={[
              "mt-1 text-sm font-extrabold tabular-nums",
              open
                ? "text-slate-600"
                : "text-slate-400",
            ].join(" ")}
          >
            {timeText}
          </div>

          {error ? (
            <div className="mt-1 text-xs font-black text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            "bg-slate-50 text-sm font-black text-slate-400 transition",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        >
          ?
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-4 pb-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-slate-900">
                {isArabic
                  ? "\u062d\u0627\u0644\u0629 \u0627\u0644\u064a\u0648\u0645"
                  : "Day status"}
              </div>

              <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                {open
                  ? isArabic
                    ? "\u0645\u062a\u0627\u062d \u0644\u0644\u062d\u062c\u0632"
                    : "Available for booking"
                  : isArabic
                    ? "\u0644\u0646 \u062a\u0638\u0647\u0631 \u0633\u0627\u0639\u0627\u062a \u0644\u0644\u0632\u0628\u0627\u0626\u0646"
                    : "No customer slots"}
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={open}
              onClick={() => onToggleOpen(!open)}
              className={[
                "relative h-8 w-14 shrink-0 rounded-full transition",
                open
                  ? "bg-emerald-500"
                  : "bg-slate-200",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all",
                  open
                    ? isArabic
                      ? "right-7"
                      : "left-7"
                    : isArabic
                      ? "right-1"
                      : "left-1",
                ].join(" ")}
              />
            </button>
          </div>

          {open ? (
            <div className="mt-4 grid grid-cols-[1fr,auto,1fr] items-end gap-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black text-slate-500">
                  {isArabic
                    ? "\u0645\u0646"
                    : "From"}
                </span>

                <input
                  type="time"
                  step="1800"
                  value={safeValue.from}
                  onChange={(event) =>
                    onChange({
                      from: event.target.value,
                    })
                  }
                  className={[
                    "min-h-12 w-full rounded-xl border bg-slate-50 px-2",
                    "text-center text-[15px] font-black text-slate-950 tabular-nums outline-none",
                    error
                      ? "border-rose-300 focus:ring-2 focus:ring-rose-100"
                      : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                  ].join(" ")}
                />
              </label>

              <span className="mb-3 text-sm font-black text-slate-300">
                ?
              </span>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black text-slate-500">
                  {isArabic
                    ? "\u0625\u0644\u0649"
                    : "To"}
                </span>

                <input
                  type="time"
                  step="1800"
                  value={safeValue.to}
                  onChange={(event) =>
                    onChange({
                      to: event.target.value,
                    })
                  }
                  className={[
                    "min-h-12 w-full rounded-xl border bg-slate-50 px-2",
                    "text-center text-[15px] font-black text-slate-950 tabular-nums outline-none",
                    error
                      ? "border-rose-300 focus:ring-2 focus:ring-rose-100"
                      : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                  ].join(" ")}
                />
              </label>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-500">
              {isArabic
                ? "\u0641\u0639\u0651\u0644 \u0627\u0644\u064a\u0648\u0645 \u0625\u0630\u0627 \u0628\u062f\u0643 \u062a\u0631\u062c\u0639 \u062a\u0641\u062a\u062d \u0627\u0644\u062d\u062c\u0632 \u0641\u064a\u0647."
                : "Turn this day on to make it bookable again."}
            </div>
          )}

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-800">
              ? {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
