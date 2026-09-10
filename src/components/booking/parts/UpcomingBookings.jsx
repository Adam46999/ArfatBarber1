// src/components/booking/parts/UpcomingBookings.jsx
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

function getBookingStartDate(booking) {
  if (booking?.startAt?.toDate) {
    const date = booking.startAt.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
  }

  if (booking?.startAt instanceof Date && !Number.isNaN(booking.startAt.getTime())) {
    return booking.startAt;
  }

  const numericTimestamp = Number(booking?.timestamp);
  if (Number.isFinite(numericTimestamp) && numericTimestamp > 0) {
    const date = new Date(numericTimestamp);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const dateYMD =
    typeof booking?.slotDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(booking.slotDate)
      ? booking.slotDate
      : booking?.selectedDate;

  if (!dateYMD || !booking?.selectedTime) return null;

  const date = new Date(`${dateYMD}T${booking.selectedTime}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function UpcomingBookings({ bookings, phoneNumber, t, language }) {
  if (!phoneNumber || bookings.length === 0) return null;

  // ✅ فلترة الحجوزات: فقط لنفس رقم الهاتف + مش ملغية + جاية
  const upcoming = bookings
    .filter((b) => b.phoneNumber === phoneNumber) // ← أضفنا هذا السطر
    .filter((b) => !b.cancelledAt)
    .filter((b) => {
      const bookingDateTime = getBookingStartDate(b);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return Boolean(bookingDateTime && bookingDateTime >= today);
    })
    .sort((a, b) => {
      const aTime = getBookingStartDate(a);
      const bTime = getBookingStartDate(b);
      return (aTime?.getTime() || 0) - (bTime?.getTime() || 0);
    });

  if (upcoming.length === 0) return null;

  return (
    <div className="mt-6 bg-white p-5 border rounded-2xl shadow-md">
      <h4 className="font-bold mb-4 text-gold text-lg">
        {t("your_upcoming_bookings")}
      </h4>

      <ul className="space-y-3">
        {upcoming.map((b, idx) => {
          const bookingDate = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
          const locale = language === "ar" ? ar : enUS;

          const formattedDate = format(
            bookingDate,
            "EEEE, dd/MM/yyyy - HH:mm",
            { locale }
          );

          return (
            <li
              key={idx}
              className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-2 hover:bg-gray-100 transition"
            >
              <div>
                <p className="font-semibold text-primary">{formattedDate}</p>
                <p className="text-sm text-gray-600">{b.selectedService}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-gold text-primary rounded-full">
                {t("confirmed")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default UpcomingBookings;
