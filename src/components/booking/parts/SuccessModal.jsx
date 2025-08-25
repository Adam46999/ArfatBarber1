// src/components/booking/parts/SuccessModal.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Props:
 * - visible (bool), onClose (func), code (string), t (func)
 * - booking? = { customerName, phone, service, date, time, duration, price, barber, location, notes }
 * - autoCloseMs?, primaryAction?, primaryLabel?
 */
export default function SuccessModal({
  visible,
  onClose,
  code,
  t,
  booking = {},
  autoCloseMs,
  primaryAction,
  primaryLabel,
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const containerRef = useRef(null);
  const firstFocusRef = useRef(null);
  const lastFocusRef = useRef(null);
  const liveRegionRef = useRef(null);

  // قفل تمرير الصفحة عند الفتح
  useLayoutEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  // ESC + Focus trap + AutoClose
  useEffect(() => {
    if (!visible) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab") {
        const focusable = containerRef.current?.querySelectorAll(
          'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    const focusId = setTimeout(() => firstFocusRef.current?.focus(), 30);

    let autoId;
    if (autoCloseMs && Number.isFinite(autoCloseMs) && autoCloseMs > 0) {
      autoId = setTimeout(() => onClose?.(), autoCloseMs);
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(focusId);
      if (autoId) clearTimeout(autoId);
    };
  }, [visible, onClose, autoCloseMs]);

  const announce = (msg) => {
    if (!liveRegionRef.current) return;
    liveRegionRef.current.textContent = "";
    setTimeout(() => (liveRegionRef.current.textContent = msg), 50);
  };

  const copyText = async (text, setFlag, announceMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      announce(announceMsg);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      /* ignore copy error */
    }
  };

  const lines = () =>
    [
      `${t?.("thank_you") || "شكرًا لك"} ✅`,
      `${t?.("your_code") || "الكود"}: ${code || "-"}`,
      booking?.customerName
        ? `${t?.("customer_name") || "الاسم"}: ${booking.customerName}`
        : null,
      booking?.phone ? `${t?.("phone") || "الهاتف"}: ${booking.phone}` : null,
      booking?.service
        ? `${t?.("service") || "الخدمة"}: ${booking.service}`
        : null,
      booking?.date || booking?.time
        ? `${t?.("appointment_time") || "موعدك"}: ${[booking.date, booking.time]
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
      booking?.location
        ? `${t?.("location") || "الموقع"}: ${booking.location}`
        : null,
      booking?.notes ? `${t?.("notes") || "ملاحظات"}: ${booking.notes}` : null,
    ].filter(Boolean);

  const handleCopyCode = () =>
    copyText(
      String(code || ""),
      setCopiedCode,
      t?.("copied_code") || "تم نسخ الكود"
    );

  const handleCopyAll = () =>
    copyText(
      lines().join("\n"),
      setCopiedAll,
      t?.("copied_details") || "تم نسخ التفاصيل"
    );

  const handleShare = async () => {
    const title = t?.("booking_confirmed") || "تم تأكيد الحجز";
    const text = lines().join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(wa, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* ignore share error */
    }
  };

  const addToCalendar = () => {
    const startLocal =
      booking?.date && booking?.time
        ? new Date(`${booking.date}T${booking.time}:00`)
        : null;
    const endLocal = startLocal
      ? new Date(startLocal.getTime() + 30 * 60 * 1000)
      : null;
    const fmt = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return (
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        "T" +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        "Z"
      );
    };
    const dtStart = startLocal ? fmt(startLocal) : "";
    const dtEnd = endLocal ? fmt(endLocal) : "";
    const summary = booking?.service
      ? `${t?.("service") || "الخدمة"}: ${booking.service}`
      : t?.("booking_confirmed") || "حجز";
    const description = lines().join("\\n");
    const location = booking?.location || "";

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Arfat Barber//Booking//EN",
      "BEGIN:VEVENT",
      dtStart && `DTSTART:${dtStart}`,
      dtEnd && `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      location && `LOCATION:${location}`,
      `UID:${(code || Date.now()) + "@arfat-barber"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "booking.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const Row = ({ label, value, mono }) =>
    value ? (
      <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 border-[#E5E7EB]">
        <span className="text-[#6B7280]">{label}</span>
        <span
          className={
            mono
              ? "font-mono font-semibold text-[#1F2937]"
              : "font-semibold text-[#1F2937]"
          }
        >
          {value}
        </span>
      </div>
    ) : null;

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="success-title"
      aria-describedby="success-desc"
    >
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

      <div
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        className="
          absolute left-1/2 -translate-x-1/2
          bottom-0 w-full max-w-md sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto
          sm:rounded-2xl rounded-t-3xl
          shadow-[0_24px_80px_-10px_rgba(0,0,0,0.45)]
          ring-1 ring-[#3B82F6]/30
          bg-gradient-to-b from-white to-[#F9FAFB]
          animate-[sheetIn_.22s_ease] sm:animate-[fadeIn_.22s_ease]
        "
      >
        <div className="sm:hidden flex justify-center pt-3">
          <span className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
        </div>

        <div className="hidden sm:block absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3B82F6] via-[#3B82F6] to-[#FACC15]" />

        <div className="px-5 pt-5 sm:pt-8 pb-3 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6]/10">
            <span className="text-2xl">✅</span>
          </div>
          <h2
            id="success-title"
            className="text-xl sm:text-2xl font-extrabold text-[#1F2937] tracking-tight"
          >
            {t?.("thank_you") || "شكرًا لك"}
          </h2>
          <p id="success-desc" className="mt-1 text-sm text-[#6B7280]">
            {t?.("booking_confirmed") || "تم تأكيد الحجز بنجاح"}
          </p>
        </div>

        {/* بطاقة الكود */}
        <div className="mx-4 sm:mx-6 rounded-2xl border bg-white px-4 py-3 mb-3 sm:mb-4 ring-1 ring-[#3B82F6]/10 border-[#E5E7EB]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
              <span>🔐 {t?.("your_code") || "الكود"}:</span>
            </div>
            <div
              dir="ltr"
              className="font-mono text-base font-bold text-[#111827] select-all"
            >
              {String(code || "-")}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              ref={firstFocusRef}
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#3B82F6] text-white hover:opacity-90 transition"
            >
              {copiedCode ? "✅ تم نسخ الكود" : t?.("copy_code") || "نسخ الكود"}
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#1F2937] text-white hover:opacity-90 transition"
            >
              {t?.("share") || "مشاركة"}
            </button>
            <button
              onClick={primaryAction || addToCalendar}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#E5E7EB] bg-white text-[#1F2937] hover:bg-[#F9FAFB] transition"
            >
              📅 {primaryLabel || t?.("add_to_calendar") || "أضف للتقويم"}
            </button>
          </div>
        </div>

        {/* التفاصيل (إن وجدت) */}
        {(booking?.customerName ||
          booking?.phone ||
          booking?.service ||
          booking?.date ||
          booking?.time ||
          booking?.duration ||
          booking?.price ||
          booking?.barber ||
          booking?.location ||
          booking?.notes) && (
          <div className="mx-4 sm:mx-6 mb-3 sm:mb-4 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
            <Row
              label={t?.("customer_name") || "الاسم"}
              value={booking.customerName}
            />
            <Row label={t?.("phone") || "الهاتف"} value={booking.phone} />
            <Row label={t?.("service") || "الخدمة"} value={booking.service} />
            <Row
              label={t?.("appointment_time") || "موعدك"}
              value={[booking.date, booking.time].filter(Boolean).join(" | ")}
            />
            <Row label={t?.("duration") || "المدة"} value={booking.duration} />
            <Row label={t?.("price") || "السعر"} value={booking.price} />
            <Row label={t?.("barber") || "الحلاق"} value={booking.barber} />
            <Row label={t?.("location") || "الموقع"} value={booking.location} />
            <Row label={t?.("notes") || "ملاحظات"} value={booking.notes} />
            <div className="pt-3 flex items-center gap-2">
              <button
                onClick={handleCopyAll}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#3B82F6] text-white hover:opacity-90 transition"
              >
                {copiedAll
                  ? "✅ تم نسخ التفاصيل"
                  : t?.("copy_all") || "نسخ كل التفاصيل"}
              </button>
            </div>
          </div>
        )}

        <p className="mx-4 sm:mx-6 text-[13px] text-[#6B7280] mb-4 sm:mb-5">
          {t?.("keep_code_hint") ||
            "احتفظ بهذا الكود لتعديل أو إلغاء الحجز لاحقًا."}
        </p>

        <div className="px-4 sm:px-6 pb-5 sm:pb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center rounded-xl bg-[#3B82F6] text-white px-4 py-3 font-semibold hover:opacity-90 transition"
          >
            {t?.("got_it") || "تمام"}
          </button>
          <button
            ref={lastFocusRef}
            onClick={handleCopyAll}
            className="w-full inline-flex items-center justify-center rounded-xl bg-white text-[#1F2937] border border-[#E5E7EB] px-4 py-3 font-semibold hover:bg-[#F9FAFB] transition"
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
        @keyframes sheetIn {
          from { transform: translate(-50%, 12px); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
