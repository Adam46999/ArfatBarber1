// src/pages/AdminBookings.jsx

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FaClock, FaPhone, FaUser, FaCut, FaCalendarAlt } from "react-icons/fa";

// دالة لتحويل التاريخ من YYYY-MM-DD إلى DD/MM/YYYY
function formatDateArabic(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// دالة لتحويل Timestamp إلى DD/MM/YYYY – HH:MM
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
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  // جلب الحجوزات من Firestore عند التحميل
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(data);
        setFilteredBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
      setLoading(false);
    };
    fetchBookings();
  }, []);

  // فلترة الحجوزات عندما يتغير selectedDate
  useEffect(() => {
    if (!selectedDate) {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(
        bookings.filter((b) => b.selectedDate === selectedDate)
      );
    }
  }, [selectedDate, bookings]);

  return (
    <section className={`min-h-screen bg-gray-100 p-4 ${fontClass}`} dir="rtl">
      {/* Spacer للإبعاد عن الهيدر الثابت */}
      <div className="h-16"></div>

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl px-4 lg:px-8 py-8">
        {/* رأس الصفحة */}
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

        {/* فلترة حسب التاريخ */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <label htmlFor="filter-date" className="font-medium text-gray-700">
            {t("select_date") || "اختر التاريخ"}:
          </label>
          <input
            type="date"
            id="filter-date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="
              w-full sm:w-auto
              border border-gray-300 bg-gray-50
              rounded-lg px-4 py-2
              focus:outline-none focus:ring-2 focus:ring-gold
              transition
            "
            min={new Date().toISOString().split("T")[0]}
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-sm text-red-600 hover:underline"
            >
              {t("clear_filter") || "إظهار الكل"}
            </button>
          )}
        </div>

        {/* عرض Loading نصي أثناء التحميل */}
        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">
            {t("loading") || "جاري التحميل..."}
          </div>
        ) : (
          <>
            {filteredBookings.length === 0 ? (
              <p className="text-center text-gray-500 py-20">
                {t("no_bookings") || "لا توجد حجوزات."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBookings.map((booking) => {
                  const addedAt = formatDateTime(booking.createdAt);
                  return (
                    <div
                      key={booking.id}
                      className="
                        bg-white rounded-2xl shadow-md
                        border border-gray-100
                        p-6 flex flex-col justify-between
                        hover:shadow-lg transition-shadow
                      "
                    >
                      <div className="space-y-2 text-gray-700">
                        <p className="flex items-center gap-2 text-sm">
                          <FaUser className="text-gold" />
                          <span className="truncate">{booking.fullName}</span>
                        </p>
                        <p className="flex items-center gap-2 text-sm">
                          <FaPhone className="text-gray-500" />{" "}
                          <span>{booking.phoneNumber}</span>
                        </p>
                        <p className="flex items-center gap-2 text-sm">
                          <FaCalendarAlt className="text-gray-500" />{" "}
                          <span>{formatDateArabic(booking.selectedDate)}</span>
                        </p>
                        <p className="flex items-center gap-2 text-sm">
                          <FaClock className="text-gray-500" />{" "}
                          <span>{booking.selectedTime}</span>
                        </p>
                        <p className="flex items-center gap-2 text-sm">
                          <FaCut className="text-gray-500" />{" "}
                          <span>
                            {t(`service_${booking.selectedService}`)}
                          </span>
                        </p>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <p className="text-xs text-gray-400">
                          {`${t("date_added")}: ${addedAt}`}
                        </p>
                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                t("confirm_cancel") ||
                                  "هل تريد حقًا إلغاء هذا الحجز؟"
                              )
                            ) {
                              await deleteDoc(doc(db, "bookings", booking.id));
                              setBookings((prev) =>
                                prev.filter((b) => b.id !== booking.id)
                              );
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title={t("cancel_booking_tooltip") || "إلغاء الحجز"}
                        >
                          {t("cancel_booking") || "إلغاء"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
