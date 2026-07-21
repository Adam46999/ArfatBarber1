// src/pages/barberPanel/components/StickySaveBar.jsx

import React from "react";

export default function StickySaveBar({
  isArabic = true,
  disabled = false,
  saving = false,
  dirty = false,
  hasErrors = false,
  onSave,
  onReset,
}) {
  const t = isArabic
    ? {
        save: "حفظ التغييرات",
        saving: "جاري الحفظ...",
        reset: "إرجاع افتراضي",
        unsaved: "تغييرات غير محفوظة",
        saved: "كل شيء محفوظ",
        errors: "يوجد أخطاء",
        tip: "لن يتم تطبيق أي تغيير إلا بعد الضغط على حفظ.",
      }
    : {
        save: "Save changes",
        saving: "Saving…",
        reset: "Reset default",
        unsaved: "Unsaved changes",
        saved: "All saved",
        errors: "Has errors",
        tip: "Nothing applies unless you press Save.",
      };

  const renderBadge = () => {
    if (hasErrors) {
      return (
        <span className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-800">
          <span className="text-base leading-none">⚠️</span>
          {t.errors}
        </span>
      );
    }

    if (dirty) {
      return (
        <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">
          <span className="text-base leading-none">✳️</span>
          {t.unsaved}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
        <span className="text-base leading-none">✅</span>
        {t.saved}
      </span>
    );
  };

  return (
    <div className="mt-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {renderBadge()}

            <div className="mt-2 text-[11px] font-black leading-5 text-slate-500">
              {t.tip}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
            <button
              type="button"
              onClick={onReset}
              disabled={saving}
              className={[
                "min-h-11 rounded-2xl border border-slate-200 bg-white px-4",
                "text-sm font-black text-slate-900 transition",
                "hover:bg-slate-50",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              {t.reset}
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={disabled}
              className={[
                "min-h-11 rounded-2xl px-5",
                "bg-emerald-600 text-sm font-black text-white",
                "shadow-sm transition hover:bg-emerald-700",
                "disabled:cursor-not-allowed disabled:bg-slate-300",
                "disabled:text-slate-500 disabled:shadow-none",
              ].join(" ")}
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
