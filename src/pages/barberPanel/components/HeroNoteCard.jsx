import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const DEFAULT_NOTE = {
  enabled: false,
  text: "",
  type: "normal",
};

const TYPE_STYLES = {
  normal: "bg-yellow-100 text-yellow-900 border-yellow-300",
  important: "bg-rose-100 text-rose-900 border-rose-300",
  offer: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

export default function HeroNoteCard() {
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    const ref = doc(db, "barberSettings", "general");

    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setNote({
        enabled: Boolean(data.heroNote?.enabled),
        text: data.heroNote?.text || "",
        type: data.heroNote?.type || "normal",
      });
    });

    return () => unsub();
  }, []);

  const saveNote = async () => {
    setSaving(true);
    setSavedMsg("");

    await setDoc(
      doc(db, "barberSettings", "general"),
      {
        heroNote: {
          enabled: note.enabled,
          text: note.text.trim(),
          type: note.type,
          updatedAt: Date.now(),
        },
      },
      { merge: true },
    );

    setSaving(false);
    setSavedMsg("تم حفظ الملاحظة بنجاح");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const previewStyle = TYPE_STYLES[note.type] || TYPE_STYLES.normal;

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-200 text-right">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-black text-gray-900">
              ملاحظة الهيرو
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              تظهر للزبون في أعلى الصفحة الرئيسية.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setNote((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            className="shrink-0"
          >
            <div
              className={`relative w-16 h-8 rounded-full transition-colors ${
                note.enabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-md transition-transform ${
                  note.enabled ? "translate-x-8" : "translate-x-0"
                }`}
              />
            </div>
          </button>
        </div>

        <label className="block text-sm font-bold text-gray-700 mb-2">
          نوع الملاحظة
        </label>

        <select
          value={note.type}
          onChange={(e) =>
            setNote((prev) => ({ ...prev, type: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-yellow-300 outline-none"
        >
          <option value="normal">عادية</option>
          <option value="important">مهمة</option>
          <option value="offer">عرض</option>
        </select>

        <label className="block text-sm font-bold text-gray-700 mb-2">
          نص الملاحظة
        </label>

        <textarea
          value={note.text}
          maxLength={120}
          rows={3}
          onChange={(e) =>
            setNote((prev) => ({ ...prev, text: e.target.value }))
          }
          placeholder="مثال: اليوم يوجد ضغط عالي، يرجى الحجز مسبقاً."
          className="w-full border border-gray-300 rounded-xl p-3 resize-none focus:ring-2 focus:ring-yellow-300 outline-none"
        />

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>الحد المناسب: سطرين تقريباً</span>
          <span>{note.text.length}/120</span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2">المعاينة:</p>

          {note.enabled && note.text.trim() ? (
            <div
              className={`border rounded-2xl px-4 py-3 text-sm font-bold animate-pulse ${previewStyle}`}
            >
              <span className="ml-2">📌</span>
              {note.text}
            </div>
          ) : (
            <div className="border rounded-2xl px-4 py-3 text-sm text-gray-400 bg-gray-50">
              الملاحظة غير مفعّلة أو فارغة.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={saveNote}
          disabled={saving}
          className="mt-4 w-full bg-gray-900 text-white py-3 rounded-xl font-bold disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "حفظ الملاحظة"}
        </button>

        {savedMsg && (
          <p className="text-center text-emerald-600 text-sm font-bold mt-3">
            {savedMsg}
          </p>
        )}
      </div>
    </div>
  );
}
