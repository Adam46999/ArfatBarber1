import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "he";
  const fontClass = isRTL ? "font-ar" : "font-body";

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

  // ✅ تأكد من تنسيق التاريخ لـ "YYYY-MM-DD"
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
        <h1 className="text-3xl font-bold mb-6 text-gold text-center">
          {t("admin_bookings")}
        </h1>

        {/* فلترة التاريخ */}
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
              {t("clear_filter") || "Clear Filter"}
            </button>
          )}
        </div>

        {filteredBookings.length === 0 ? (
          <p className="text-center text-gray-500">{t("no_bookings")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm border border-gray-200 rounded-xl">
              <thead className="bg-gold text-primary">
                <tr>
                  <th className="p-2">{t("name")}</th>
                  <th className="p-2">{t("phone")}</th>
                  <th className="p-2">{t("select_date")}</th>
                  <th className="p-2">{t("choose_time")}</th>
                  <th className="p-2">{t("choose_service")}</th>
                  <th className="p-2">{t("date_added")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const added = booking.createdAt?.toDate?.();
                  return (
                    <tr key={booking.id} className="border-t text-center">
                      <td className="p-2">{booking.fullName}</td>
                      <td className="p-2">{booking.phoneNumber}</td>
                      <td className="p-2">{normalizeDate(booking.selectedDate)}</td>
                      <td className="p-2">{booking.selectedTime}</td>
                      <td className="p-2">{booking.selectedService}</td>
                      <td className="p-2">
                        {added
                          ? `${added.toLocaleDateString()} - ${added.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminBookings;
