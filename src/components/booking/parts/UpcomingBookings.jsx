// src/components/booking/parts/UpcomingBookings.jsx
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

function UpcomingBookings({ bookings, phoneNumber, t, language }) {
  if (!phoneNumber || bookings.length === 0) return null;

  // ✅ فلترة الحجوزات: فقط لنفس رقم الهاتف + مش ملغية + جاية
  const upcoming = bookings
    .filter((b) => b.phoneNumber === phoneNumber) // ← أضفنا هذا السطر
    .filter((b) => !b.cancelledAt)
    .filter((b) => {
      const normalized = `${b.selectedDate}T${b.selectedTime}`;
      const bookingDateTime = new Date(normalized);

      // بداية اليوم (00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return !isNaN(bookingDateTime.getTime()) && bookingDateTime >= today;
    })
    .sort((a, b) => {
      const aTime = new Date(`${a.selectedDate}T${a.selectedTime}`);
      const bTime = new Date(`${b.selectedDate}T${b.selectedTime}`);
      return aTime - bTime;
    });

  if (upcoming.length === 0) return null;

  return (
    <div className="mt-6 bg-white p-5 border rounded-2xl shadow-md">
      <h4 className="font-bold mb-4 text-gold text-lg">
        {t("your_upcoming_bookings")}
      </h4>

      <ul className="space-y-3">
        {upcoming.map((b, idx) => {
          const bookingDate = new Date(`${b.selectedDate}T${b.selectedTime}`);
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
