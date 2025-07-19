import { useState } from "react";
import { db } from "../../firebase";
import SectionTitle from "../common/SectionTitle";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

function BookingTracker() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [codeInputs, setCodeInputs] = useState({});
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessages, setErrorMessages] = useState({});

  const handleCheck = async () => {
    setResults([]);
    setNotFound(false);
    setSuccessMessage("");
    setErrorMessages({});
    if (!phone) return;

    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), where("phoneNumber", "==", phone));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setNotFound(true);
      } else {
        const data = snapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
        }));
        setResults(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
    setLoading(false);
  };

  const handleCancel = async (booking) => {
    const code = codeInputs[booking.docId] || "";
    if (!code || code !== booking.bookingCode) {
      setErrorMessages((prev) => ({
        ...prev,
        [booking.docId]: t("wrong_code") || "رمز التحقق غير صحيح",
      }));
      return;
    }

    try {
      await deleteDoc(doc(db, "bookings", booking.docId));
      setResults((prev) => prev.filter((b) => b.docId !== booking.docId));
      setSuccessMessage(t("booking_canceled") || "✅ تم إلغاء الحجز بنجاح");
    } catch (error) {
      console.error("Error while cancelling:", error);
      alert("حدث خطأ أثناء محاولة الإلغاء.");
    }
  };

  return (
    <section className="bg-white py-16 px-4 text-center text-primary font-body">
<SectionTitle icon="🔍">
  {t("check_booking") || "تحقق من الحجز برقم الهاتف"}
</SectionTitle>
      <div className="max-w-md mx-auto">
        <input
          type="tel"
          placeholder={t("phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-md mb-4"
        />

        <button
          onClick={handleCheck}
          className="bg-gold text-primary font-bold px-6 py-2 rounded hover:bg-darkText hover:text-light transition"
        >
          {t("check") || "تحقق"}
        </button>

        {loading && <p className="mt-4 text-sm text-gray-500">{t("loading") || "جاري التحقق..."}</p>}

        {notFound && (
          <p className="mt-4 text-red-600 font-semibold">{t("no_booking_found") || "لا يوجد حجز مرتبط بهذا الرقم."}</p>
        )}

        {results.length > 0 && (
          <div className="mt-6 space-y-6">
            {results.map((booking) => (
              <div
                key={booking.docId}
                className="bg-beige rounded-lg shadow-md p-4 text-left"
              >
                <p><strong>{t("name")}:</strong> {booking.fullName}</p>
                <p><strong>{t("phone")}:</strong> {booking.phoneNumber}</p>
                <p><strong>{t("select_date")}:</strong> {booking.selectedDate}</p>
                <p><strong>{t("choose_time")}:</strong> {booking.selectedTime}</p>
                <p><strong>{t("choose_service")}:</strong> {t(`service_${booking.selectedService}`)}</p>

                <input
                  type="text"
                  placeholder={t("enter_code") || "أدخل رمز التحقق"}
                  value={codeInputs[booking.docId] || ""}
                  onChange={(e) =>
                    setCodeInputs((prev) => ({
                      ...prev,
                      [booking.docId]: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 p-2 rounded mt-4"
                />

                {errorMessages[booking.docId] && (
                  <p className="text-red-600 mt-1 text-sm font-semibold">
                    {errorMessages[booking.docId]}
                  </p>
                )}

                <button
                  onClick={() => handleCancel(booking)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition mt-2"
                >
                  {t("cancel_booking") || "إلغاء الحجز"}
                </button>
              </div>
            ))}
          </div>
        )}

        {successMessage && (
          <p className="mt-4 text-green-600 font-semibold">{successMessage}</p>
        )}
      </div>
    </section>
  );
}

export default BookingTracker;
