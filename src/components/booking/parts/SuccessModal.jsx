// src/components/booking/SuccessModal.jsx
import { useEffect, useRef, useState } from "react";

/**
 * Props:
 * - visible (bool)
 * - onClose (func)
 * - code (string)
 * - t (func) دالة الترجمة
 * - booking (object اختياري)
 */
export default function SuccessModal({
  visible,
  onClose,
  code,
  t,
  booking = {},
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);

  // ✅ لا نُعيد null قبل الـHooks؛ نحكم تشغيل التأثير بشرط "visible"
  useEffect(() => {
    if (!visible) return; // إذا المودال مخفي لا نعمل شيء

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    // تركيز زر الإغلاق بعد الفتح
    const id = setTimeout(() => closeBtnRef.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(id);
    };
    // ملاحظة: onClose داخل deps آمن لأننا لا نغيّر مرجعه عادة
  }, [visible, onClose]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(code || ""));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } catch (err) {
      console.error("share failed", err);

      // no-empty fix: إمّا تعليق أو لوج بسيط
      // console.error("copy code failed", err);
    }
  };

  const handleCopyAll = async () => {
    try {
      const lines = [
        `${t?.("thank_you") || "شكرًا لك"} ✅`,
        `${t?.("your_code") || "الكود"}: ${code || "-"}`,
        booking?.service
          ? `${t?.("service") || "الخدمة"}: ${booking.service}`
          : null,
        booking?.date || booking?.time
          ? `${t?.("appointment_time") || "موعدك"}: ${[
              booking.date,
              booking.time,
            ]
              .filter(Boolean)
              .join(" | ")}`
          : null,
        booking?.duration
          ? `${t?.("duration") || "المدة"}: ${booking.duration}`
          : null,
        booking?.price ? `${t?.("price") || "السعر"}: ${booking.price}` : null,
        booking?.barber
          ? `${t?.("barber") || "الحلاق"}: ${booking.barber}`
          : null,
        booking?.phone ? `${t?.("phone") || "الهاتف"}: ${booking.phone}` : null,
        booking?.location
          ? `${t?.("location") || "الموقع"}: ${booking.location}`
          : null,
        booking?.notes
          ? `${t?.("notes") || "ملاحظات"}: ${booking.notes}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      await navigator.clipboard.writeText(lines);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch (err) {
      console.error("share failed", err);

      // no-empty fix
      // console.error("copy all failed", err);
    }
  };

  const handleShare = async () => {
    const title = t?.("booking_confirmed") || "تم تأكيد الحجز";
    const text =
      (t?.("your_code") || "الكود") +
      `: ${code}\n` +
      (booking?.service
        ? `${t?.("service") || "الخدمة"}: ${booking.service}\n`
        : "") +
      (booking?.date || booking?.time
        ? `${t?.("appointment_time") || "موعدك"}: ${[booking.date, booking.time]
            .filter(Boolean)
            .join(" | ")}\n`
        : "");
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await handleCopyAll();
      }
    } catch (err) {
      console.error("share failed", err);

      // no-empty fix
      // console.error("share failed", err);
    }
  };

  const stop = (e) => e.stopPropagation();

  const Row = ({ label, value, mono }) =>
    value ? (
      <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 border-gray-100">
        <span className="text-gray-600">{label}</span>
        <span
          className={
            mono
              ? "font-mono font-semibold text-gray-900"
              : "font-semibold text-gray-900"
          }
        >
          {value}
        </span>
      </div>
    ) : null;

  // ✅ نُعيد null بعد الـHooks
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="success-title"
      aria-describedby="success-desc"
    >
      <div
        ref={dialogRef}
        onClick={stop}
        className="
          relative w-full max-w-md mx-4
          rounded-2xl overflow-hidden
          shadow-[0_20px_60px_-10px_rgba(0,0,0,0.35)]
          ring-1 ring-green-400/30
          bg-gradient-to-b from-white to-green-50
          animate-[fadeIn_.2s_ease]
        "
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600" />

        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="absolute top-3 end-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 hover:text-red-600 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          aria-label={t?.("close") || "إغلاق"}
        >
          ×
        </button>

        <div className="px-6 pt-8 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl">✅</span>
          </div>
          <h2
            id="success-title"
            className="text-2xl font-extrabold text-gray-900 tracking-tight"
          >
            {t?.("thank_you") || "شكرًا لك"}
          </h2>
          <p id="success-desc" className="mt-1 text-sm text-gray-600">
            {t?.("booking_confirmed") || "تم تأكيد الحجز بنجاح"}
          </p>
        </div>

        <div className="mx-6 rounded-xl border border-green-400/60 bg-white px-4 py-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <span>🔐 {t?.("your_code") || "الكود"}:</span>
            </div>
            <div
              dir="ltr"
              className="font-mono text-base font-bold text-gray-900 select-all"
            >
              {String(code || "-")}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition"
            >
              {copiedCode ? "✅ تم نسخ الكود" : t?.("copy_code") || "نسخ الكود"}
            </button>
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:opacity-90 transition"
            >
              {t?.("share") || "مشاركة"}
            </button>
          </div>
        </div>

        {(booking?.service ||
          booking?.date ||
          booking?.time ||
          booking?.duration ||
          booking?.price ||
          booking?.barber ||
          booking?.phone ||
          booking?.location ||
          booking?.notes) && (
          <div className="mx-6 mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <Row label={t?.("service") || "الخدمة"} value={booking.service} />
            <Row
              label={t?.("appointment_time") || "موعدك"}
              value={[booking.date, booking.time].filter(Boolean).join(" | ")}
            />
            <Row label={t?.("duration") || "المدة"} value={booking.duration} />
            <Row label={t?.("price") || "السعر"} value={booking.price} />
            <Row label={t?.("barber") || "الحلاق"} value={booking.barber} />
            <Row label={t?.("phone") || "الهاتف"} value={booking.phone} />
            <Row label={t?.("location") || "الموقع"} value={booking.location} />
            <Row label={t?.("notes") || "ملاحظات"} value={booking.notes} />
            <div className="pt-3 flex items-center gap-2">
              <button
                onClick={handleCopyAll}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                {copiedAll
                  ? "✅ تم نسخ التفاصيل"
                  : t?.("copy_all") || "نسخ كل التفاصيل"}
              </button>
            </div>
          </div>
        )}

        <p className="mx-6 text-[13px] text-gray-500 mb-5">
          {t?.("keep_code_hint") ||
            "احتفظ بهذا الكود لتعديل أو إلغاء الحجز لاحقًا."}
        </p>

        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center rounded-xl bg-green-600 text-white px-4 py-2.5 font-semibold hover:bg-green-700 transition"
          >
            {t?.("got_it") || "تمام"}
          </button>
          <button
            onClick={handleCopyAll}
            className="w-full inline-flex items-center justify-center rounded-xl bg-white text-gray-900 border border-gray-200 px-4 py-2.5 font-semibold hover:bg-gray-50 transition"
          >
            {copiedAll
              ? "✅ تم نسخ التفاصيل"
              : t?.("copy_and_close") || "نسخ التفاصيل"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
