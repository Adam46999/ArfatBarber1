export default function UndoToast({ undo, onUndo, onClose }) {
  if (!undo) return null;

  return (
    <div
      className="
        fixed left-1/2 z-[9999]
        w-[calc(100%-24px)] max-w-md
        -translate-x-1/2
        bottom-[calc(88px+env(safe-area-inset-bottom))]
      "
    >
      <div
        className="
          flex items-center gap-3
          rounded-2xl bg-slate-950
          px-4 py-3 text-white
          shadow-2xl
        "
      >
        <div className="min-w-0 flex-1 text-xs font-bold">
          تم إخفاء التقييم.
        </div>

        <button
          type="button"
          onClick={onUndo}
          className="
            shrink-0 rounded-xl
            bg-white px-3 py-1.5
            text-xs font-black text-slate-950
          "
        >
          تراجع
        </button>

        <button
          type="button"
          onClick={onClose}
          className="
            shrink-0 rounded-lg px-2 py-1
            text-sm font-black text-white/60
            hover:bg-white/10 hover:text-white
          "
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
