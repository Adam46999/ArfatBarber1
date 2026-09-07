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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-4 backdrop-blur-[3px] sm:px-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col items-center gap-3.5 overflow-y-auto overscroll-contain rounded-[24px] border border-emerald-200/90 bg-[linear-gradient(180deg,#fffefb_0%,#ffffff_55%,#f8fff9_100%)] px-4 py-6 text-center text-lg text-emerald-700 shadow-[0_24px_70px_rgba(15,23,42,0.24)] ring-1 ring-white/80 sm:px-6 sm:py-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-xl font-bold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          aria-label="إغلاق"
        >
          ×
        </button>

        <div className="w-full px-10 text-xl font-black leading-7 text-slate-900">
          ✅ {title || t("thank_you")}
        </div>

        {oldDate && newDate ? (
          <div className="w-full rounded-[16px] border border-[#e7dfcf] bg-gradient-to-b from-[#fffdf8] to-[#faf7f0] p-4 text-right shadow-[0_6px_18px_rgba(31,24,12,0.05)]">
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

        <div className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-dashed border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-4 py-3 text-base font-semibold text-slate-800 shadow-[0_6px_18px_rgba(5,150,105,0.06)]">
          <div className="min-w-0 text-right">
            <span>🔐 {t("your_code")}: </span>
            <span className="break-all font-mono font-bold">{code}</span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] shrink-0 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            {copied ? "✅ تم النسخ!" : "نسخ"}
          </button>
        </div>

        {codeNote ? (
          <p className="text-sm font-bold text-green-800">{codeNote}</p>
        ) : null}

        <p className="text-sm font-medium leading-6 text-slate-600">
          احتفظ بهذا الكود لتعديل أو إلغاء الحجز لاحقًا.
        </p>

        {canSendToWhatsApp ? (
          <div className="w-full border-t border-[#ece7dd] pt-3">
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