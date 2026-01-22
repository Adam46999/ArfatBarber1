// src/pages/barberPanel/components/WeeklyHoursEditSheet.jsx
import { useMemo, useState } from "react";
import WeeklyHoursEditorMobile from "./WeeklyHoursEditorMobile";
import { normalizeWeekly } from "../utils/weeklyHoursUX";

/**
 * ✅ DE-MODALIZED VERSION
 * كان هذا الملف Sheet/Modal.
 * هسا صار Inline wrapper (Card) عشان:
 * - ما نستخدم مودالات
 * - ما نخرب أي import موجود بالمشروع
 * - يضل فيه Confirm إذا في تغييرات غير محفوظة
 */
export default function WeeklyHoursEditSheet({
  isArabic,
  initialWeekly,
  onClose,
}) {
  const base = useMemo(() => normalizeWeekly(initialWeekly), [initialWeekly]);
  const [dirty, setDirty] = useState(false);

  const closeWithConfirm = () => {
    if (dirty) {
      const ok = window.confirm(
        isArabic
          ? "لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟"
          : "You have unsaved changes. Leave without saving?",
      );
      if (!ok) return;
    }
    onClose?.();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-900">
              {isArabic ? "تعديل ساعات العمل الأسبوعية" : "Edit weekly hours"}
            </div>
            <div className="text-sm font-bold text-slate-600 mt-1 leading-5">
              {isArabic
                ? "عدّل الساعات ثم اضغط حفظ. يمكنك الإلغاء للرجوع بدون حفظ."
                : "Edit then press Save. You can cancel to discard changes."}
            </div>
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={closeWithConfirm}
              className="h-10 px-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-sm font-black hover:bg-slate-50"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
          ) : null}
        </div>

        {/* Safety line */}
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
          ℹ️{" "}
          {isArabic
            ? "لن يتم تطبيق أي تغيير إلا بعد الضغط على زر الحفظ."
            : "No change applies unless you press Save."}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-4">
        <WeeklyHoursEditorMobile
          isArabic={isArabic}
          loading={false}
          initialWeekly={base}
          onDirtyChange={setDirty}
        />
      </div>
    </div>
  );
}
