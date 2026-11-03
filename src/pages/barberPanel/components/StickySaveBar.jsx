// src/pages/barberPanel/components/StickySaveBar.jsx

export default function StickySaveBar({
  isArabic = true,
  disabled = false,
  saving = false,
  dirty = false,
  hasErrors = false,
  onSave,
}) {
  if (!dirty && !hasErrors && !saving) {
    return null;
  }

  const title = hasErrors
    ? isArabic
      ? "\u0641\u064a \u062e\u0637\u0623 \u0644\u0627\u0632\u0645 \u064a\u062a\u0635\u0644\u062d"
      : "Fix an error first"
    : isArabic
      ? "\u0639\u0646\u062f\u0643 \u062a\u063a\u064a\u064a\u0631\u0627\u062a \u063a\u064a\u0631 \u0645\u062d\u0641\u0648\u0638\u0629"
      : "You have unsaved changes";

  return (
    <div className="sticky bottom-3 z-30 mt-5">
      <div className="rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-[0_16px_45px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div
              className={[
                "text-xs font-black",
                hasErrors
                  ? "text-rose-700"
                  : "text-amber-800",
              ].join(" ")}
            >
              {title}
            </div>

            <div className="mt-0.5 text-[10px] font-bold text-slate-400">
              {isArabic
                ? "\u0645\u0627 \u0628\u062a\u062a\u0637\u0628\u0642 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0642\u0628\u0644 \u0627\u0644\u062d\u0641\u0638"
                : "Changes apply only after saving"}
            </div>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            className={[
              "min-h-11 shrink-0 rounded-xl px-5 text-sm font-black transition",
              "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
              "disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none",
            ].join(" ")}
          >
            {saving
              ? isArabic
                ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..."
                : "Saving..."
              : isArabic
                ? "\u062d\u0641\u0638"
                : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
