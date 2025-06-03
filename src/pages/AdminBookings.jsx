// ✅ AdminBookings.jsx - النسخة النهائية بدون أخطاء
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FaClock, FaPhone, FaUser, FaCut, FaCalendarAlt } from "react-icons/fa";

// دالة لتنسيق التاريخ
function formatDateArabic(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// دالة لتنسيق الوقت والتاريخ من Firestore
function formatDateTime(timestamp) {
  if (!timestamp?.toDate) return "";
  const d = timestamp.toDate();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} – ${hours}:${minutes}`;
}

export default function AdminBookings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar" || i18n.language === "he";
  const fontClass = isRTL ? "font-ar" : "font-body";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const now = new Date();

        const validBookings = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const { selectedDate, selectedTime } = data;

          const bookingDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
          const diff = now - bookingDateTime;
          const hoursDiff = diff / (1000 * 60 * 60);

          if (hoursDiff > 24) {
            // ❌ حذف الحجوزات القديمة (أكثر من 24 ساعة)
            await deleteDoc(doc(db, "bookings", docSnap.id));
          } else {
            // ✅ إضافة الحجوزات الحالية أو التي مرّ عليها أقل من 24 ساعة
            validBookings.push({
              id: docSnap.id,
              ...data,
              isPast: bookingDateTime < now, // هل الموعد مضى؟
            });
          }
        }

        setBookings(validBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
      setLoading(false);
    };
    fetchBookings();
  }, []);

  return (
    <section className={`min-h-screen bg-gray-100 p-4 ${fontClass}`} dir="rtl">
      <div className="h-16"></div>

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl px-4 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline text-sm mb-4 md:mb-0"
          >
            ← {t("go_back") || "عودة"}
          </button>
          <h1 className="text-3xl font-semibold text-gray-800">
            {t("admin_bookings") || "لوحة الحجوزات"}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">
            {t("loading") || "جاري التحميل..."}
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-gray-500 py-20">
            {t("no_bookings") || "لا توجد حجوزات."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className={`
                  rounded-2xl shadow-md border p-6 flex flex-col justify-between
                  ${booking.isPast ? "bg-gray-200 text-gray-500" : "bg-white"}
                `}
              >
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <FaUser className="text-gold" />
                    <span>{booking.fullName}</span>
                  </p>
                 <p className="flex items-center gap-2">
  <FaPhone className="text-gray-500" />
  <a
    href={`tel:${booking.phoneNumber}`}
    className="text-blue-600 hover:underline"
  >
    {booking.phoneNumber}
  </a>
</p>
                  <p className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-500" />{" "}
                    {formatDateArabic(booking.selectedDate)}
                  </p>
                  <p className="flex items-center gap-2">
                    <FaClock className="text-gray-500" /> {booking.selectedTime}
                  </p>
                  <p className="flex items-center gap-2">
                    <FaCut className="text-gray-500" />{" "}
                    {t(`service_${booking.selectedService}`)}
                  </p>
                </div>
                <div className="mt-4 flex justify-between items-center text-xs">
                  <p className="text-gray-400">{`${t("date_added")}: ${formatDateTime(booking.createdAt)}`}</p>
                  {!booking.isPast && (
                    <button
                      onClick={async () => {
                        if (window.confirm(t("confirm_cancel") || "هل تريد إلغاء الحجز؟")) {
                          await deleteDoc(doc(db, "bookings", booking.id));
                          setBookings((prev) =>
                            prev.filter((b) => b.id !== booking.id)
                          );
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                      title={t("cancel_booking_tooltip") || "إلغاء الحجز"}
                    >
                      {t("cancel_booking") || "إلغاء"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
