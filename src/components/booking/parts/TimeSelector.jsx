// src/components/booking/parts/TimeSelector.jsx

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/**
 * يضمن أن اسم مفتاح الترجمة
 * لن يظهر للمستخدم إذا كان المفتاح ناقصًا.
 */
function translate(t, key, fallback) {
  if (typeof t !== "function") {
    return fallback;
  }

  const translated = t(key, {
    defaultValue: fallback,
  });

  if (!translated || translated === key) {
    return fallback;
  }

  return translated;
}

export default function TimeSelector({
  selectedDate,
  selectedTime,
  onSelectTime,
  availableTimes = [],
  workingHours,
  t,
}) {
  if (!selectedDate) {
    return null;
  }

  const [year, month, day] = selectedDate.split("-");

  const dateObject = new Date(Number(year), Number(month) - 1, Number(day));

  const weekday = dateObject.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const hours = workingHours?.[weekday];

  /**
   * لا نفرّق أمام المستخدم بين:
   *
   * - يوم مغلق حسب ساعات العمل.
   * - يوم أُغلق يدويًا.
   * - يوم انتهت كل مواعيده.
   *
   * الرسالة الأوضح دائمًا:
   * لا توجد مواعيد، اختر يومًا آخر.
   */
  if (!hours || availableTimes.length === 0) {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-right"
        role="status"
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
          <ClockIcon />
        </div>

        <div>
          <p className="text-sm font-bold text-amber-900">
            {translate(t, "no_hours", "لا توجد مواعيد متاحة في هذا اليوم.")}
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-800">
            {translate(
              t,
              "choose_another_day",
              "اختر يومًا آخر لمشاهدة المواعيد المتاحة.",
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-3 gap-2.5 sm:grid-cols-4"
      role="radiogroup"
      aria-label={translate(t, "choose_time", "اختر الساعة")}
    >
      {availableTimes.map((time) => {
        const isSelected = selectedTime === time;

        return (
          <button
            key={time}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectTime(time)}
            className={[
              "relative flex min-h-[46px] w-full items-center justify-center",
              "rounded-xl border px-2 py-2.5",
              "text-sm font-bold tabular-nums",
              "outline-none",
              "transition-colors duration-150",
              "focus-visible:ring-4 focus-visible:ring-gold/25",

              isSelected
                ? "border-[#b98a21] bg-gradient-to-br from-[#e6bd57] to-[#f3d77f] text-[#172033] shadow-[0_6px_14px_rgba(185,138,33,0.22)]"
                : "border-slate-300 bg-white text-slate-800 hover:border-[#c9a64d] hover:bg-[#fffaf0]",
            ].join(" ")}
          >
            <span>{time}</span>

            {isSelected && (
              <span
                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[#806013]"
                aria-hidden="true"
              >
                <CheckIcon />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
