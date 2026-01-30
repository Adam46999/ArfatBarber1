// src/pages/barberPanel/reviews/UndoToast.jsx
export default function UndoToast({ undo, onUndo, onClose }) {
  if (!undo) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999]">
      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
        <div className="text-sm">
          تم أرشفة تقييم {undo.name ? `(${undo.name})` : ""}.
        </div>

        <button
          className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 font-black text-sm"
          onClick={onUndo}
        >
          تراجع
        </button>

        <button
          className="px-3 py-1.5 rounded-xl bg-white/0 hover:bg-white/10 font-black text-sm"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
