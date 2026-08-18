export default function ExtraSlotsCard({
  selectedDate,
  extraSlots,
  loadingExtras,
  savingExtras,
  applyMode,
  setApplyMode,
  applyUntil,
  setApplyUntil,
  onApply,
}) {
  const busy = loadingExtras || savingExtras;

  const currentValue = loadingExtras
    ? "..."
    : extraSlots === 0
      ? "طبيعي"
      : extraSlots > 0
        ? `+${extraSlots}`
        : `${extraSlots}`;

  const scopeLabel =
    applyMode === "SAME_WEEKDAY_UNTIL"
      ? "نفس اليوم لحد تاريخ"
      : applyMode === "EVERY_DAY_UNTIL"
        ? "كل الأيام لحد تاريخ"
        : "هذا اليوم فقط";

  return (
    <div className="w-full sm:w-auto">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => onApply(extraSlots - 1)}
          className="
            rounded-xl border border-rose-200 bg-rose-50
            px-3 py-2 text-xs font-black text-rose-700
            transition hover:bg-rose-100
            disabled:cursor-not-allowed disabled:opacity-50
          "
          title="تنقيص دور واحد من نهاية اليوم"
        >
          - دور
        </button>

        <button
          type="button"
          disabled={busy || extraSlots === 0}
          onClick={() => onApply(0)}
          className={[
            "rounded-xl border px-3 py-2 text-xs font-black transition",
            "disabled:cursor-not-allowed disabled:opacity-50",
            extraSlots === 0
              ? "border-slate-800 bg-slate-800 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
          ].join(" ")}
          title="الرجوع لعدد الأدوار الطبيعي"
        >
          طبيعي
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onApply(extraSlots + 1)}
          className="
            rounded-xl border border-emerald-200 bg-emerald-50
            px-3 py-2 text-xs font-black text-emerald-700
            transition hover:bg-emerald-100
            disabled:cursor-not-allowed disabled:opacity-50
          "
          title="إضافة دور واحد في نهاية اليوم"
        >
          + دور
        </button>

        <span
          className="
            rounded-xl border border-slate-200 bg-white
            px-3 py-2 text-[11px] font-black text-slate-600
          "
          title="التعديل الحالي على عدد الأدوار"
        >
          الحالي: {currentValue}
        </span>
      </div>

      <details className="mt-2 text-xs">
        <summary
          className="
            cursor-pointer select-none text-[11px] font-bold
            text-slate-500 hover:text-slate-700
          "
        >
          نطاق التطبيق: {scopeLabel}
        </summary>

        <div
          className="
            mt-2 grid gap-2 rounded-xl border border-slate-200
            bg-white p-3 shadow-sm sm:min-w-[320px]
          "
        >
          <label className="text-[11px] font-black text-slate-600">
            تطبيق التعديل
          </label>

          <select
            value={applyMode}
            onChange={(event) => setApplyMode(event.target.value)}
            className="
              w-full rounded-xl border border-slate-200 bg-white
              px-3 py-2 text-xs font-bold text-slate-700
              focus:outline-none focus:ring-2 focus:ring-amber-200
            "
          >
            <option value="THIS_DATE">هذا اليوم فقط</option>
            <option value="SAME_WEEKDAY_UNTIL">
              نفس يوم الأسبوع لحد تاريخ
            </option>
            <option value="EVERY_DAY_UNTIL">
              كل الأيام لحد تاريخ
            </option>
          </select>

          {applyMode !== "THIS_DATE" ? (
            <>
              <label className="mt-1 text-[11px] font-black text-slate-600">
                لحد تاريخ
              </label>

              <input
                type="date"
                value={applyUntil}
                min={selectedDate || undefined}
                onChange={(event) => setApplyUntil(event.target.value)}
                className="
                  w-full rounded-xl border border-slate-200 bg-white
                  px-3 py-2 text-xs font-bold text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-amber-200
                "
              />
            </>
          ) : null}

          <p className="text-[10px] font-semibold leading-5 text-slate-500">
            كل دور = 30 دقيقة. النظام يمنع التنقيص إذا كان الدور الذي سيتم
            حذفه يحتوي على حجز.
          </p>
        </div>
      </details>
    </div>
  );
}