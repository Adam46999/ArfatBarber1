// src/pages/barberPanel/components/StickySaveBar.jsx
function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "h-12 rounded-2xl px-4 text-base font-black transition disabled:opacity-60 disabled:cursor-not-allowed " +
        className
      }
    >
      {children}
    </button>
  );
}

export default function StickySaveBar({
  isArabic,
  disabled,
  saving,
  dirty,
  hasErrors,
  onSave,
  onReset,
}) {
  const hint = hasErrors
    ? isArabic
      ? "أصلح الأخطاء قبل الحفظ"
      : "Fix errors before saving"
    : dirty
      ? isArabic
        ? "تغييرات جاهزة للحفظ"
        : "Changes ready to save"
      : isArabic
        ? "لا توجد تغييرات"
        : "No changes";

  return (
    <div className="fixed left-0 right-0 bottom-0 z-20">
      {/* push above floating buttons */}
      <div className="mx-auto max-w-xl px-4 pb-5">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-3">
          <div className="text-xs font-black text-slate-600 mb-2">{hint}</div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onReset}
              className="flex-1 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"
              disabled={saving}
            >
              {isArabic ? "إرجاع" : "Reset"}
            </Button>

            <Button
              type="button"
              onClick={onSave}
              className="flex-[1.4] bg-emerald-500 text-white hover:bg-emerald-600"
              disabled={disabled}
            >
              {saving
                ? isArabic
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isArabic
                  ? "حفظ"
                  : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
