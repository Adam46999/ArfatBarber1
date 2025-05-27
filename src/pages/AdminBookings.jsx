import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FaClock, FaPhone, FaUser, FaCut } from "react-icons/fa";

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "he";
  const fontClass = isRTL ? "font-ar" : "font-body";
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, []);

  const normalizeDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const filteredBookings = selectedDate
    ? bookings.filter((b) => normalizeDate(b.selectedDate) === selectedDate)
    : bookings;

  return (
    <section className={`min-h-screen bg-[#f5f5f5] p-6 pt-24 ${fontClass}`}>
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
        {/* 🔙 زر العودة الثابت */}
        <button
          onClick={() => navigate("/barber")}
          className="mb-6 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← {t("go_back") || "عودة إلى لوحة الحلاق"}
        </button>

        <h1 className="text-3xl font-bold mb-6 text-gold text-center">
          {t("admin_bookings")}
        </h1>

        {/* فلترة بالتاريخ */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700">{t("select_date")}:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 p-2 rounded-md"
            />
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-sm text-red-600 hover:underline"
            >
              {t("clear_filter") || "إزالة الفلتر"}
            </button>
          )}
        </div>

        {/* 🧾 عرض الحجوزات */}
        {filteredBookings.length === 0 ? (
          <p className="text-center text-gray-500">{t("no_bookings")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBookings.map((booking) => {
              const added = booking.createdAt?.toDate?.();
              return (
                <div key={booking.id} className="bg-[#fafafa] border border-gray-200 shadow-md rounded-2xl p-5 space-y-2 hover:shadow-xl transition">
                  <div className="flex items-center gap-2 text-gold text-lg font-bold">
                    <FaUser /> {booking.fullName}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <FaPhone /> {booking.phoneNumber}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    📅 {normalizeDate(booking.selectedDate)}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <FaClock /> {booking.selectedTime}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
<FaCut /> {t(`service_${booking.selectedService}`)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-end">
                    {t("date_added")}: {added?.toLocaleDateString()} - {added?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminBookings;
