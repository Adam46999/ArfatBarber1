// src/components/booking/SuccessModal.jsx
import { useState } from "react";

export default function SuccessModal({ visible, onClose, code, t }) {
  const [copied, setCopied] = useState(false);
  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // تجاهل بهدوء
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white border border-green-400 text-green-700 px-6 py-8 rounded-2xl text-center text-lg flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600 text-xl font-bold"
          aria-label="إغلاق"
        >
          ×
        </button>

        <div className="text-xl font-bold">✅ {t("thank_you")}</div>

        <div className="bg-green-100 border border-dashed border-green-500 px-4 py-2 rounded-lg text-base font-semibold text-gray-800 flex items-center gap-2">
          🔐 {t("your_code")}: <span className="font-mono">{code}</span>
          <button
            onClick={handleCopy}
            className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
          >
            {copied ? "✅ تم النسخ!" : "نسخ"}
          </button>
        </div>

        <p className="text-sm text-gray-600">
          احتفظ بهذا الكود لتعديل أو إلغاء الحجز لاحقًا.
        </p>
      </div>
    </div>
  );
}
