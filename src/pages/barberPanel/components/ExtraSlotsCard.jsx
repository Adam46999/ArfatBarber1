// src/pages/barberPanel/components/ExtraSlotsCard.jsx
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
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            ➕➖ زيادة/نقص عدد الأدوار (كل دور = 30 دقيقة)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            هذا لا يغيّر ساعات العمل الأساسية. فقط يضيف/ينقص أدوار إضافية في
            نهاية اليوم.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loadingExtras || savingExtras}
            onClick={() => onApply(extraSlots - 1)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold disabled:opacity-60"
            title="(-1) ينقص آخر دور"
          >
            -1
          </button>

          <div className="min-w-[90px] text-center">
            <div className="text-xs text-slate-500">القيمة الحالية</div>
            <div className="text-xl font-extrabold text-slate-900">
              {loadingExtras
                ? "…"
                : extraSlots >= 0
                ? `+${extraSlots}`
                : `${extraSlots}`}
            </div>
          </div>

          <button
            type="button"
            disabled={loadingExtras || savingExtras}
            onClick={() => onApply(extraSlots + 1)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold disabled:opacity-60"
            title="(+1) يزيد دور واحد بعد آخر دور"
          >
            +1
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            نطاق التطبيق
          </label>

          <select
            value={applyMode}
            onChange={(e) => setApplyMode(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="THIS_DATE">هذا اليوم فقط</option>
            <option value="SAME_WEEKDAY_UNTIL">
              نفس يوم الأسبوع لحد تاريخ
            </option>
            <option value="EVERY_DAY_UNTIL">كل الأيام لحد تاريخ</option>
          </select>

          <div className="mt-2 text-[11px] text-slate-600 leading-relaxed">
            {applyMode === "THIS_DATE" && (
              <span>
                ✅ التعديل يُطبَّق فقط على هذا التاريخ: <b>{selectedDate}</b>
              </span>
            )}
            {applyMode === "SAME_WEEKDAY_UNTIL" && (
              <span>
                ✅ يطبَّق على <b>نفس يوم الأسبوع</b> من <b>{selectedDate}</b>{" "}
                حتى تاريخ النهاية.
              </span>
            )}
            {applyMode === "EVERY_DAY_UNTIL" && (
              <span>
                ✅ يطبَّق على <b>كل الأيام</b> من <b>{selectedDate}</b> حتى
                تاريخ النهاية.
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            تاريخ النهاية (إذا اخترت “لحد تاريخ”)
          </label>

          <input
            type="date"
            value={applyUntil}
            onChange={(e) => setApplyUntil(e.target.value)}
            disabled={applyMode === "THIS_DATE"}
            min={selectedDate || undefined}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60"
          />

          <button
            type="button"
            disabled={loadingExtras || savingExtras}
            onClick={() => onApply(0)}
            className="mt-3 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-sm font-bold disabled:opacity-60"
            title="يرجع للوضع الطبيعي"
          >
            رجّع للوضع الطبيعي (0)
          </button>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <b>معلومة مهمة:</b>
        <br />
        (+1) = يزيد <b>دور واحد</b> بعد آخر دور.
        <br />
        (-1) = ينقص <b>آخر دور</b>.
        <br />
        إذا كان هناك <b>حجز</b> على دور سيتم حذفه، النظام يمنع التقليل حتى لا
        ينكسر شيء.
      </div>
    </div>
  );
}
