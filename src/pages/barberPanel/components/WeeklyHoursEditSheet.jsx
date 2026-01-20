// src/pages/barberPanel/components/WeeklyHoursEditSheet.jsx
import { useMemo, useState } from "react";
import WeeklyHoursEditorMobile from "./WeeklyHoursEditorMobile";
import { normalizeWeekly } from "../utils/weeklyHoursUX";

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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30">
      {/* Backdrop */}
      <button
        aria-label="close"
        className="absolute inset-0 bg-black/40"
        onClick={closeWithConfirm}
      />

      {/* Sheet */}
      <div className="absolute left-0 right-0 bottom-0">
        <div className="mx-auto max-w-xl">
          <div className="bg-[#f8f8f8] rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[92vh] overflow-auto">
            {/* Handle */}
            <div className="pt-3 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-4 pt-3 pb-4 border-b border-slate-200 bg-white rounded-t-3xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-slate-900">
                    {isArabic ? "وضع التعديل" : "Edit mode"}
                  </div>
                  <div className="text-sm font-bold text-slate-600 mt-1 leading-5">
                    {isArabic
                      ? "عدّل الساعات ثم اضغط حفظ. اضغط إلغاء للرجوع بدون تغييرات."
                      : "Edit then press Save. Cancel to discard changes."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeWithConfirm}
                  className="h-10 px-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-sm font-black hover:bg-slate-50"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
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
            <div className="px-4 pt-4 pb-24">
              <WeeklyHoursEditorMobile
                isArabic={isArabic}
                loading={false}
                initialWeekly={base}
                onDirtyChange={setDirty}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
