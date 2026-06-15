import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  FaBullhorn,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGift,
  FaInfoCircle,
} from "react-icons/fa";

import { db } from "../../../firebase";

const DEFAULT_NOTE = {
  enabled: false,
  text: "",
  type: "normal",
};

const NOTE_TYPES = [
  {
    value: "normal",
    label: "رسالة عادية",
    description: "معلومة بسيطة للزبائن",
    icon: FaInfoCircle,
    buttonClass: "border-yellow-300 bg-yellow-50 text-yellow-900",
    previewClass: "border-yellow-300 bg-yellow-100 text-yellow-950",
  },
  {
    value: "important",
    label: "تنبيه مهم",
    description: "تغيير أو ضغط أو خبر مهم",
    icon: FaExclamationTriangle,
    buttonClass: "border-rose-300 bg-rose-50 text-rose-900",
    previewClass: "border-rose-300 bg-rose-100 text-rose-950",
  },
  {
    value: "offer",
    label: "عرض",
    description: "عرض أو خصم للزبائن",
    icon: FaGift,
    buttonClass: "border-emerald-300 bg-emerald-50 text-emerald-900",
    previewClass: "border-emerald-300 bg-emerald-100 text-emerald-950",
  },
];

function normalizeNote(heroNote) {
  return {
    enabled: Boolean(heroNote?.enabled),
    text: String(heroNote?.text || ""),
    type: ["normal", "important", "offer"].includes(heroNote?.type)
      ? heroNote.type
      : "normal",
  };
}

function notesAreEqual(first, second) {
  return (
    first.enabled === second.enabled &&
    first.text === second.text &&
    first.type === second.type
  );
}

export default function HeroNoteCard() {
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [savedNote, setSavedNote] = useState(DEFAULT_NOTE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    const reference = doc(db, "barberSettings", "general");

    const unsubscribe = onSnapshot(
      reference,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};

        const nextNote = normalizeNote(data.heroNote);

        setNote(nextNote);
        setSavedNote(nextNote);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load hero note:", error);

        setLoading(false);

        setMessage({
          type: "error",
          text: "تعذر تحميل الرسالة. تأكد من الاتصال وحاول مرة ثانية.",
        });
      },
    );

    return () => unsubscribe();
  }, []);

  const selectedType = useMemo(() => {
    return NOTE_TYPES.find((item) => item.value === note.type) || NOTE_TYPES[0];
  }, [note.type]);

  const hasChanges = useMemo(() => {
    return !notesAreEqual(note, savedNote);
  }, [note, savedNote]);

  const trimmedText = note.text.trim();

  function updateNote(field, value) {
    setNote((current) => ({
      ...current,
      [field]: value,
    }));

    setMessage({
      type: "",
      text: "",
    });
  }

  function toggleEnabled() {
    if (!note.enabled && !trimmedText) {
      setMessage({
        type: "error",
        text: "اكتب الرسالة أولًا، وبعدها فعّل ظهورها للزبائن.",
      });

      return;
    }

    updateNote("enabled", !note.enabled);
  }

  async function saveNote() {
    if (saving || !hasChanges) {
      return;
    }

    if (note.enabled && !trimmedText) {
      setMessage({
        type: "error",
        text: "لا يمكن إظهار رسالة فارغة للزبائن.",
      });

      return;
    }

    setSaving(true);

    setMessage({
      type: "",
      text: "",
    });

    try {
      const noteToSave = {
        enabled: note.enabled && Boolean(trimmedText),
        text: trimmedText,
        type: note.type,
      };

      await setDoc(
        doc(db, "barberSettings", "general"),
        {
          heroNote: {
            ...noteToSave,
            updatedAt: serverTimestamp(),
          },
        },
        {
          merge: true,
        },
      );

      setNote(noteToSave);
      setSavedNote(noteToSave);

      setMessage({
        type: "success",
        text: noteToSave.enabled
          ? "تم حفظ الرسالة، وهي ظاهرة الآن للزبائن."
          : "تم حفظ الرسالة، وهي مخفية عن الزبائن.",
      });

      window.setTimeout(() => {
        setMessage({
          type: "",
          text: "",
        });
      }, 3500);
    } catch (error) {
      console.error("Failed to save hero note:", error);

      setMessage({
        type: "error",
        text: "تعذر حفظ الرسالة. حاول مرة ثانية.",
      });
    } finally {
      setSaving(false);
    }
  }

  function cancelChanges() {
    setNote(savedNote);

    setMessage({
      type: "",
      text: "",
    });
  }

  if (loading) {
    return (
      <div className="mx-auto mt-6 max-w-3xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm font-bold text-gray-500 shadow-sm">
          جارٍ تحميل رسالة الزبائن...
        </div>
      </div>
    );
  }

  const PreviewIcon = selectedType.icon;

  return (
    <div dir="rtl" className="mx-auto mt-6 max-w-3xl">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 text-right shadow-sm sm:p-6">
        {/* العنوان والحالة */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FaBullhorn className="text-yellow-600" />

              <h2 className="text-lg font-black text-gray-900">
                رسالة للزبائن
              </h2>
            </div>

            <p className="mt-1 text-xs leading-6 text-gray-500 sm:text-sm">
              رسالة قصيرة تظهر للزبائن في أعلى الصفحة الرئيسية.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleEnabled}
            className="shrink-0"
            aria-label={note.enabled ? "إخفاء الرسالة" : "إظهار الرسالة"}
          >
            <div
              className={`relative h-8 w-16 rounded-full transition-colors ${
                note.enabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow-md transition-transform ${
                  note.enabled ? "translate-x-[-32px]" : "translate-x-[-2px]"
                }`}
              />
            </div>
          </button>
        </div>

        <div
          className={`mt-4 rounded-xl border px-3 py-2 text-sm font-bold ${
            note.enabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-gray-200 bg-gray-50 text-gray-500"
          }`}
        >
          {note.enabled ? "الرسالة ظاهرة للزبائن" : "الرسالة مخفية عن الزبائن"}
        </div>

        {/* نوع الرسالة */}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-black text-gray-700">
            نوع الرسالة
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            {NOTE_TYPES.map((item) => {
              const Icon = item.icon;
              const selected = note.type === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => updateNote("type", item.value)}
                  className={`rounded-2xl border p-3 text-right transition ${
                    selected
                      ? `${item.buttonClass} ring-2 ring-current/10`
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="shrink-0" />

                    <span className="text-sm font-black">{item.label}</span>
                  </div>

                  <p className="mt-1 text-xs opacity-75">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* نص الرسالة */}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-black text-gray-700">
            نص الرسالة
          </label>

          <textarea
            value={note.text}
            maxLength={120}
            rows={3}
            onChange={(event) => updateNote("text", event.target.value)}
            placeholder="مثال: اليوم يوجد ضغط، ننصح بالحجز مسبقًا."
            className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 p-3 text-right leading-7 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200"
          />

          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>خلي الرسالة قصيرة وواضحة.</span>

            <span
              className={
                note.text.length >= 110 ? "font-bold text-rose-600" : ""
              }
            >
              {note.text.length}/120
            </span>
          </div>
        </div>

        {/* المعاينة */}

        <div className="mt-5">
          <p className="mb-2 text-xs font-black text-gray-500">
            كيف ستظهر للزبائن:
          </p>

          {note.enabled && trimmedText ? (
            <div
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${selectedType.previewClass}`}
            >
              <PreviewIcon className="mt-1 shrink-0" />

              <span>{note.text}</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-400">
              {trimmedText
                ? "فعّل الرسالة حتى تظهر للزبائن."
                : "اكتب رسالة حتى تظهر المعاينة هنا."}
            </div>
          )}
        </div>

        {/* الرسائل */}

        {message.text && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <FaCheckCircle />
            ) : (
              <FaExclamationTriangle />
            )}

            {message.text}
          </div>
        )}

        {/* الأزرار */}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={saveNote}
            disabled={saving || !hasChanges}
            className="w-full rounded-xl bg-gray-900 px-5 py-3 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving
              ? "جارٍ الحفظ..."
              : hasChanges
                ? "حفظ التغييرات"
                : "تم الحفظ"}
          </button>

          {hasChanges && (
            <button
              type="button"
              onClick={cancelChanges}
              disabled={saving}
              className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
            >
              إلغاء التغييرات
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
