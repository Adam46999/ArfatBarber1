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

  const badge = () => {
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
    <div className="fixed left-0 right-0 bottom-0 z-30">
      {/* Blur background */}
      <div className="pointer-events-none absolute inset-0 bg-white/70 backdrop-blur-md border-t border-slate-200" />
      <div className="relative max-w-xl mx-auto px-4 py-3">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              {badge()}
              <div className="text-[11px] font-black text-slate-500 leading-4">
                {t.tip}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Reset */}
              <button
                type="button"
                onClick={onReset}
                disabled={saving}
                className="h-11 px-4 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black hover:bg-slate-50 transition disabled:opacity-60"
              >
                {t.reset}
              </button>

              {/* Save */}
              <button
                type="button"
                onClick={onSave}
                disabled={disabled || saving}
                className={[
                  "h-11 px-5 rounded-2xl text-sm font-black transition",
                  disabled || saving
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-slate-800",
                ].join(" ")}
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safe spacing to avoid content hidden behind bar */}
      <div className="h-20" />
    </div>
  );
}
