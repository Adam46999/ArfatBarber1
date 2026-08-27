// src/components/booking/SuccessModal.jsx
import { useState } from "react";

function formatBookingDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());

  if (!match) {
    return String(value || "").trim();
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export default function SuccessModal({
  visible,
  onClose,
  code,
  booking,
  t,
  title = "",
  oldDate = "",
  oldTime = "",
  newDate = "",
  newTime = "",
  codeNote = "",
}) {
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

  const whatsappNumber = String(booking?.phoneNumber || "").replace(/\D/g, "");

  const canSendToWhatsApp = Boolean(
    whatsappNumber &&
      code &&
      booking?.selectedDate &&
      booking?.selectedTime,
  );

  const whatsappMessage = canSendToWhatsApp
    ? [
        "✂️ Arfat Barber",
        "",
        "تم تأكيد حجزك ✅",
        `كود الحجز: ${code}`,
        `التاريخ: ${formatBookingDate(booking.selectedDate)}`,
        `الساعة: ${booking.selectedTime}`,
        "",
        "احتفظ بهذا الكود لتعديل أو إلغاء الحجز لاحقًا.",
      ].join("\n")
    : "";

  const whatsappUrl = canSendToWhatsApp
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-green-400 bg-white px-5 py-7 text-center text-lg text-green-700 shadow-2xl sm:px-6 sm:py-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-gray-500 transition hover:bg-gray-100 hover:text-red-600"
          aria-label="إغلاق"
        >
          ×
        </button>

        <div className="pr-8 text-xl font-bold">
          ✅ {title || t("thank_you")}
        </div>

        {oldDate && newDate ? (
          <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-right">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-gray-500">الموعد السابق</p>
                <p className="mt-1 font-bold text-gray-800">{oldDate}</p>
                <p className="text-sm text-gray-600">الساعة {oldTime}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-green-700">الموعد الجديد</p>
                <p className="mt-1 font-bold text-gray-800">{newDate}</p>
                <p className="text-sm text-gray-600">الساعة {newTime}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-green-500 bg-green-50 px-4 py-3 text-base font-semibold text-gray-800">
          <div className="min-w-0 text-right">
            <span>🔐 {t("your_code")}: </span>
            <span className="break-all font-mono font-bold">{code}</span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] shrink-0 rounded-xl bg-green-600 px-4 text-xs font-bold text-white transition hover:bg-green-700"
          >
            {copied ? "✅ تم النسخ!" : "نسخ"}
          </button>
        </div>

        {codeNote ? (
          <p className="text-sm font-bold text-green-800">{codeNote}</p>
        ) : null}

        <p className="text-sm text-gray-600">
          احتفظ بهذا الكود لتعديل أو إلغاء الحجز لاحقًا.
        </p>

        {canSendToWhatsApp ? (
          <div className="w-full border-t border-gray-100 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(37,211,102,0.22)] transition hover:bg-[#1fba59] active:scale-[0.99]"
            >
              <span aria-hidden="true">💬</span>
              <span>إرسال التفاصيل لواتساب</span>
            </a>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              يفتح واتساب على رقم الحجز والرسالة جاهزة للإرسال.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}