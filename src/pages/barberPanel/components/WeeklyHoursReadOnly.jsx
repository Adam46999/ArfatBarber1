// src/pages/barberPanel/components/WeeklyHoursReadOnly.jsx

import {
  DAYS,
  getTodayKey,
  formatRange,
} from "../utils/weeklyHoursUX";

import {
  formatRangeArabic as _formatRangeArabic,
} from "../utils/weeklyHoursUX";

export default function WeeklyHoursReadOnly({
  weekly,
  loading,
  showHeader = true,
  updatedText,
  onEdit,
  onResetToDefault,
  isArabic = true,
}) {
  const todayKey = getTodayKey();

  const rangeText = (value) => {
    try {
      if (
        typeof formatRange === "function"
      ) {
        return formatRange(
          value,
          isArabic,
        );
      }

      return _formatRangeArabic(value);
    } catch {
      return _formatRangeArabic(value);
    }
  };

  const openDays =
    DAYS.filter(
      (day) => !!weekly?.[day.key],
    );

  function scheduleKey(value) {
    if (!value) {
      return "closed";
    }

    return `${value.from || ""}|${value.to || ""}`;
  }

  const weekGroups = [];

  DAYS.forEach((day) => {
    const value =
      weekly?.[day.key] ?? null;

    const key = scheduleKey(value);

    const last =
      weekGroups[
        weekGroups.length - 1
      ];

    if (last && last.key === key) {
      last.days.push(day);
      return;
    }

    weekGroups.push({
      key,
      value,
      days: [day],
    });
  });

  const weekSummary =
    weekGroups
      .map((group) => {
        const first =
          group.days[0];

        const last =
          group.days[
            group.days.length - 1
          ];

        const firstName =
          isArabic
            ? first.ar
            : first.en || first.key;

        const lastName =
          isArabic
            ? last.ar
            : last.en || last.key;

        const dayLabel =
          group.days.length > 1
            ? `${firstName}?${lastName}`
            : firstName;

        if (!group.value) {
          return isArabic
            ? `${dayLabel} ????`
            : `${dayLabel} closed`;
        }

        return `${dayLabel} ${group.value.from}?${group.value.to}`;
      })
      .join(" ? ");

  const closedDays =
    DAYS.filter(
      (day) => !weekly?.[day.key],
    );

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
      {showHeader ? (
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black text-slate-950">
                {isArabic
                  ? "\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064a\u0629"
                  : "Weekly working hours"}
              </div>

              {updatedText ? (
                <div className="mt-1 text-[11px] font-bold text-slate-400">
                  {isArabic
                    ? `\u0622\u062e\u0631 \u062a\u0639\u062f\u064a\u0644: ${updatedText}`
                    : `Last edit: ${updatedText}`}
                </div>
              ) : null}
            </div>

            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              >
                {isArabic
                  ? "\u062a\u0639\u062f\u064a\u0644"
                  : "Edit"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="p-4">
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-500">
            {isArabic
              ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644..."
              : "Loading..."}
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-slate-500">
                    {isArabic
                      ? "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639"
                      : "This week"}
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-950">
                    {openDays.length}
                    {" "}
                    {isArabic
                      ? "\u0623\u064a\u0627\u0645 \u0639\u0645\u0644"
                      : "working days"}
                  </div>
                </div>

                <div
                  className="flex items-center gap-1.5"
                  aria-label={
                    isArabic
                      ? "\u062d\u0627\u0644\u0629 \u0623\u064a\u0627\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639"
                      : "Week status"
                  }
                >
                  {DAYS.map((day) => {
                    const open =
                      !!weekly?.[day.key];

                    const today =
                      day.key === todayKey;

                    return (
                      <span
                        key={day.key}
                        title={
                          isArabic
                            ? day.ar
                            : day.en || day.key
                        }
                        className={[
                          "block rounded-full transition-all",
                          today
                            ? "h-3 w-3 ring-2 ring-sky-200 ring-offset-1"
                            : "h-2.5 w-2.5",
                          open
                            ? "bg-emerald-500"
                            : "bg-slate-250 bg-slate-300",
                        ].join(" ")}
                      />
                    );
                  })}
                </div>
              </div>

              <div
                dir={isArabic ? "rtl" : "ltr"}
                className="mt-3 border-t border-slate-200/70 pt-3 text-[11px] font-bold leading-5 text-slate-500"
              >
                {weekSummary}
              </div>
            </div>

            <div className="mb-2 px-1 text-xs font-black text-slate-500">
              {isArabic
                ? "\u0627\u0644\u062c\u062f\u0648\u0644 \u0627\u0644\u062d\u0627\u0644\u064a"
                : "Current schedule"}
            </div>

            <div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-200">
              {DAYS.map((day) => {
                const value =
                  weekly?.[day.key] ??
                  null;

                const open =
                  !!value;

                const today =
                  day.key === todayKey;

                return (
                  <div
                    key={day.key}
                    className={[
                      "flex min-h-[62px] items-center gap-3 px-4 py-3",
                      today
                        ? "bg-sky-50/40"
                        : "bg-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-8 w-1 shrink-0 rounded-full",
                        open
                          ? "bg-emerald-500"
                          : "bg-slate-200",
                      ].join(" ")}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-950">
                          {isArabic
                            ? day.ar
                            : day.en ||
                              day.key}
                        </span>

                        {today ? (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-700">
                            {isArabic
                              ? "\u0627\u0644\u064a\u0648\u0645"
                              : "Today"}
                          </span>
                        ) : null}
                      </div>

                      <div
                        dir="ltr"
                        className={[
                          "mt-0.5 text-xs font-extrabold tabular-nums",
                          open
                            ? "text-slate-500"
                            : "text-slate-400",
                        ].join(" ")}
                      >
                        {open
                          ? rangeText(value)
                          : isArabic
                            ? "\u0645\u063a\u0644\u0642"
                            : "Closed"}
                      </div>
                    </div>

                    <span
                      className={[
                        "rounded-full px-2 py-1 text-[9px] font-black",
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
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-[11px] font-bold leading-5 text-slate-500">
              {isArabic
                ? "\u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0639\u0644\u0649 \u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644 \u062a\u0623\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0641\u0642\u0637. \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0624\u0643\u062f\u0629 \u0645\u0627 \u0628\u062a\u062a\u063a\u064a\u0631."
                : "Schedule changes affect new bookings only. Confirmed bookings stay unchanged."}
            </div>

            {onResetToDefault ? (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={onResetToDefault}
                  className="px-3 py-2 text-[11px] font-black text-slate-400 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-700"
                >
                  {isArabic
                    ? "\u0627\u0633\u062a\u0631\u062c\u0627\u0639 \u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629"
                    : "Restore default hours"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
