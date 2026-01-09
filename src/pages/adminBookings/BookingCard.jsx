// src/pages/adminBookings/BookingCard.jsx
import { FaClock, FaPhone, FaCut, FaTimesCircle } from "react-icons/fa";
import { e164ToLocalPretty } from "../../utils/phone";
import { formatDateTime, serviceBadgeClasses, serviceLabel } from "./helpers";

export default function BookingCard({
  booking,
  isNext,
  compactMode,
  expanded,
  onToggleExpanded,
  onCancel,
}) {
  const name = booking.fullName || "بدون اسم";

  // ✅ لون الوقت (بدل الأسود)
  const timePill = "bg-indigo-600 text-white border-indigo-600"; // مريح + واضح

  // =========================
  // ✅ COMPACT MODE
  // =========================
  if (compactMode) {
    // ✅ إذا Expanded: لا نعرض السطر العلوي أبداً (حتى ما يصير دابليكيت)
    if (expanded) {
      return (
        <div
          className={`rounded-2xl bg-white border shadow-sm p-3 sm:p-4 ${
            isNext
              ? "border-emerald-300 ring-1 ring-emerald-100"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-tight break-words">
              {name}
            </h3>

            <div className="shrink-0 flex items-center gap-2">
              {isNext && (
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                  التالي
                </span>
              )}
              <span
                className={`inline-flex items-center gap-2 text-xs font-extrabold rounded-full px-3 py-1 border ${timePill}`}
              >
                <FaClock className="opacity-90" />
                {booking.selectedTime}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={`tel:${booking.phoneNumber}`}
              className="inline-flex items-center gap-2 text-sm font-extrabold px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-label={`اتصال بالزبون ${name}`}
              title="اتصال"
            >
              <FaPhone className="opacity-80" />
              اتصال
              <span className="font-semibold opacity-90">
                {e164ToLocalPretty(booking.phoneNumber)}
              </span>
            </a>

            {booking.selectedService && (
              <span
                className={`inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border ${serviceBadgeClasses(
                  booking.selectedService
                )}`}
                aria-label="الخدمة"
              >
                <FaCut className="opacity-80" />
                {serviceLabel(booking.selectedService)}
              </span>
            )}
          </div>

          <div className="mt-2 text-[11px] text-gray-500">
            تم الحجز: {formatDateTime(booking.createdAt)}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
              aria-label="إلغاء الحجز"
            >
              <FaTimesCircle />
              إلغاء
            </button>

            <button
              type="button"
              onClick={onToggleExpanded}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              إغلاق
            </button>
          </div>
        </div>
      );
    }

    // ✅ Compact collapsed: سطر واحد (اسم + وقت)
    return (
      <div
        className={`rounded-2xl border bg-white shadow-sm ${
          isNext
            ? "border-emerald-300 ring-1 ring-emerald-100"
            : "border-gray-200"
        }`}
      >
        <button
          type="button"
          onClick={onToggleExpanded}
          className="w-full text-right px-3 py-3 flex items-center justify-between gap-3"
          aria-label="فتح تفاصيل الحجز"
          title="فتح/إغلاق"
        >
          <div className="min-w-0 flex items-center gap-2">
            {isNext && (
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0">
                التالي
              </span>
            )}

            <span className="text-sm sm:text-base font-black text-gray-900 truncate">
              {name}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 text-xs font-extrabold rounded-full px-3 py-1 border ${timePill}`}
            >
              <FaClock className="opacity-90" />
              {booking.selectedTime}
            </span>

            <span className="text-[11px] text-gray-400">فتح</span>
          </div>
        </button>
      </div>
    );
  }

  // =========================
  // ✅ COMFORT MODE
  // =========================
  return (
    <div
      className={`rounded-2xl bg-white border shadow-sm p-3 sm:p-4 ${
        isNext
          ? "border-emerald-300 ring-1 ring-emerald-100"
          : "border-gray-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          {/* ✅ الاسم كامل (بدون 3 نقاط) */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-tight break-words">
              {name}
            </h3>

            <div className="shrink-0 flex items-center gap-2">
              {isNext && (
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                  التالي
                </span>
              )}
              <span
                className={`inline-flex items-center gap-2 text-xs font-extrabold rounded-full px-3 py-1 border ${timePill}`}
              >
                <FaClock className="opacity-90" />
                {booking.selectedTime}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${booking.phoneNumber}`}
              className="inline-flex items-center gap-2 text-sm font-extrabold px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-label={`اتصال بالزبون ${name}`}
              title="اتصال"
            >
              <FaPhone className="opacity-80" />
              اتصال
              <span className="font-semibold opacity-90">
                {e164ToLocalPretty(booking.phoneNumber)}
              </span>
            </a>

            <span
              className={`inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border ${serviceBadgeClasses(
                booking.selectedService
              )}`}
              aria-label="الخدمة"
            >
              <FaCut className="opacity-80" />
              {serviceLabel(booking.selectedService)}
            </span>
          </div>

          <div className="text-[11px] text-gray-500">
            تم الحجز: {formatDateTime(booking.createdAt)}
          </div>
        </div>

        <div className="sm:pt-0">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
            aria-label="إلغاء الحجز"
          >
            <FaTimesCircle />
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
