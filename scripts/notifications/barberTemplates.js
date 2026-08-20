// scripts/notifications/barberTemplates.js

/**
 * Templates خاصة بإشعارات الحلاق.
 *
 * مهم:
 * - لا يوجد إرسال هنا.
 * - لا يوجد Firestore هنا.
 * - هذا الملف فقط يبني محتوى الإشعار.
 */

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * إشعار للحلاق عند إنشاء حجز جديد.
 */
export function buildBarberNewBookingPayload(booking) {
  const customerName = safeText(booking?.fullName) || "زبون";
  const selectedDate = safeText(booking?.selectedDate);
  const selectedTime = safeText(booking?.selectedTime);
  const selectedService = safeText(booking?.selectedService);
  const bookingCode = safeText(booking?.bookingCode);

  const details = [
    customerName,
    selectedDate,
    selectedTime,
    selectedService,
  ].filter(Boolean);

  return {
    title: "✂️ حجز جديد",
    body: details.join(" • "),
    data: {
      type: "BARBER_BOOKING_CREATED",
      bookingId: safeText(booking?.id),
      bookingCode,
    },
  };
}