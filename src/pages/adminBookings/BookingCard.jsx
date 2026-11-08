// src/pages/adminBookings/BookingCard.jsx
import {
  FaClock,
  FaSms,
  FaCut,
  FaPhone,
  FaTimesCircle,
} from "react-icons/fa";

import { e164ToLocalPretty, toILPhoneE164 } from "../../utils/phone";
import CustomerInfoEditor from "./CustomerInfoEditor";
import { formatDateTime, serviceBadgeClasses, serviceLabel } from "./helpers";

function getTodayYMD() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatBookingDateForMessage(selectedDate) {
  if (!selectedDate) {
    return "";
  }

  if (selectedDate === getTodayYMD()) {
    return "اليوم";
  }

  const parts = selectedDate.split("-");

  if (parts.length !== 3) {
    return selectedDate;
  }

  const [year, month, day] = parts;

  return `بتاريخ ${day}/${month}/${year}`;
}

function buildReminderMessage(booking, name) {
  const bookingDateText = formatBookingDateForMessage(booking.slotDate || booking.selectedDate);

  const time = booking.selectedTime || "";
  const service = serviceLabel(booking.selectedService);

  return `مرحبًا ${name}،

تذكير بموعدك ${bookingDateText} لدى Arafat Barber الساعة ${time} لخدمة ${service}.

بانتظارك، ونرجو الحضور في الموعد المحدد ✂️`;
}

function buildReminderSmsUrl(booking, name) {
  const phone = toILPhoneE164(booking.phoneNumber);

  if (booking.manualBooking || !phone) return "";

  const isAppleMobile =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const separator = isAppleMobile ? "&" : "?";
  const message = buildReminderMessage(booking, name);

  return `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
}

export default function BookingCard({
  booking,
  isNext,
  compactMode,
  expanded,
  onToggleExpanded,
  onCancel,
  onEditCustomerInfo,
}) {
  const name = booking.fullName || "بدون اسم";

  const timePill = "bg-indigo-600 text-white border-indigo-600";

  const reminderSmsUrl = buildReminderSmsUrl(booking, name);
  const reminderSmsAction = reminderSmsUrl && (
    <a
      href={reminderSmsUrl}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 sm:w-auto"
    >
      <FaSms aria-hidden="true" />
      إرسال تذكير SMS
    </a>
  );

  // =========================
  // COMPACT MODE
  // =========================
  if (compactMode) {
    if (expanded) {
      return (
        <div
          className={`rounded-2xl border bg-white p-3 shadow-sm sm:p-4 ${
            isNext
              ? "border-emerald-300 ring-1 ring-emerald-100"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="break-words text-lg font-black leading-tight text-gray-900 sm:text-xl">
              {name}
            </h3>

            <div className="flex shrink-0 items-center gap-2">
              {isNext && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
                  التالي
                </span>
              )}

              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${timePill}`}
              >
                <FaClock className="opacity-90" />
                {booking.selectedTime}
              </span>
            </div>
          </div>

          {!booking.manualBooking && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={`tel:${booking.phoneNumber}`}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${serviceBadgeClasses(
                  booking.selectedService,
                )}`}
                aria-label="الخدمة"
              >
                <FaCut className="opacity-80" />

                {serviceLabel(booking.selectedService)}
              </span>
            )}
            </div>
          )}

          <div className="mt-2 text-[11px] text-gray-500">
            تم الحجز: {formatDateTime(booking.createdAt)}
          </div>

          <CustomerInfoEditor
            booking={booking}
            onSave={onEditCustomerInfo}
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {booking.manualBooking && booking.phoneNumber && <div>📞 {e164ToLocalPretty(booking.phoneNumber)}</div>}
          {booking.manualBooking && booking.selectedService && <div>✂️ {serviceLabel(booking.selectedService)}</div>}

            {reminderSmsAction}

            <button
              type="button"
              onClick={onCancel}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 sm:w-auto"
              aria-label="إلغاء الحجز"
            >
              <FaTimesCircle />
              إلغاء
            </button>

            <button
              type="button"
              onClick={onToggleExpanded}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 sm:w-auto"
            >
              إغلاق
            </button>
          </div>
        </div>
      );
    }

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
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-right"
          aria-label="فتح تفاصيل الحجز"
          title="فتح/إغلاق"
        >
          <div className="flex min-w-0 items-center gap-2">
            {isNext && (
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                التالي
              </span>
            )}

            <span className="truncate text-sm font-black text-gray-900 sm:text-base">
              {name}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${timePill}`}
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
  // COMFORT MODE
  // =========================
  return (
    <div
      className={`rounded-2xl border bg-white p-3 shadow-sm sm:p-4 ${
        isNext
          ? "border-emerald-300 ring-1 ring-emerald-100"
          : "border-gray-200"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="break-words text-lg font-black leading-tight text-gray-900 sm:text-xl">
              {name}
            </h3>

            <div className="flex shrink-0 items-center gap-2">
              {isNext && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
                  التالي
                </span>
              )}

              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${timePill}`}
              >
                <FaClock className="opacity-90" />
                {booking.selectedTime}
              </span>
            </div>
          </div>

          {!booking.manualBooking && (
            <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${booking.phoneNumber}`}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${serviceBadgeClasses(
                booking.selectedService,
              )}`}
              aria-label="الخدمة"
            >
              <FaCut className="opacity-80" />

              {serviceLabel(booking.selectedService)}
            </span>
            </div>
          )}

          <div className="text-[11px] text-gray-500">
            تم الحجز: {formatDateTime(booking.createdAt)}
          </div>

          <CustomerInfoEditor
            booking={booking}
            onSave={onEditCustomerInfo}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:pt-0">
          {booking.manualBooking && booking.phoneNumber && <div>📞 {e164ToLocalPretty(booking.phoneNumber)}</div>}
          {booking.manualBooking && booking.selectedService && <div>✂️ {serviceLabel(booking.selectedService)}</div>}

          {booking.manualBooking && booking.phoneNumber && <div>📞 {e164ToLocalPretty(booking.phoneNumber)}</div>}
          {booking.manualBooking && booking.selectedService && <div>✂️ {serviceLabel(booking.selectedService)}</div>}

          {reminderSmsAction}

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 sm:w-auto"
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
