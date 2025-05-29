// ✅ BookingTracker.jsx - نسخة كاملة تشمل: ترجمة صحيحة، زر تعديل، تحقق عبر bookingCode
import { useState } from "react";
import { db } from "../../firebase";
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
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const handleCheck = async () => {
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setSuccessMessage("");
    setError("");

    try {
      const q = query(collection(db, "bookings"), where("phoneNumber", "==", phone));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setResult({
          docId: snapshot.docs[0].id,
          name: data.fullName,
          phone: data.phoneNumber,
          date: data.selectedDate,
          time: data.selectedTime,
          service: data.selectedService,
          bookingCode: data.bookingCode || "",
        });
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error("خطأ أثناء التحقق من الحجز:", error);
    }

    setLoading(false);
  };

  const handleCancel = async () => {
    if (!result?.docId) return;

    if (!code || code !== result.bookingCode) {
      setError(t("wrong_code") || "رمز التحقق غير صحيح");
      return;
    }

    try {
      await deleteDoc(doc(db, "bookings", result.docId));
      setResult(null);
      setSuccessMessage(t("booking_canceled") || "✅ تم إلغاء الحجز بنجاح");
    } catch (error) {
      console.error("خطأ أثناء الإلغاء:", error);
      alert("حدث خطأ أثناء محاولة الإلغاء.");
    }
  };

  return (
    <section className="bg-white py-16 px-4 text-center text-primary font-body">
      <h2 className="text-2xl font-bold mb-4">🔍 {t("check_booking") || "تحقق من الحجز برقم الهاتف"}</h2>

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

        {result && (
          <div className="mt-6 bg-beige rounded-lg shadow-md p-4 text-left">
            <p><strong>{t("name")}</strong>: {result.name}</p>
            <p><strong>{t("phone")}</strong>: {result.phone}</p>
            <p><strong>{t("select_date")}</strong>: {result.date}</p>
            <p><strong>{t("choose_time")}</strong>: {result.time}</p>
            <p><strong>{t("choose_service")}</strong>: {t(`service_${result.service}`)}</p>

            <input
              type="text"
              placeholder={t("enter_code") || "أدخل رمز التحقق"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded mt-4"
            />

            {error && <p className="text-red-600 mt-1 text-sm font-semibold">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCancel}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              >
                {t("cancel_booking") || "إلغاء الحجز"}
              </button>

              <button
                onClick={() => alert(t("edit_booking") || "ميزة التعديل قيد التطوير")}
                className="bg-yellow-400 text-primary px-4 py-2 rounded hover:bg-yellow-500 transition"
              >
                {t("edit_booking") || "تعديل الحجز"}
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <p className="mt-4 text-green-600 font-semibold">{successMessage}</p>
        )}

        {notFound && (
          <p className="mt-4 text-red-600 font-semibold">
            ❌ {t("no_booking_found") || "لا يوجد حجز مرتبط بهذا الرقم."}
          </p>
        )}
      </div>
    </section>
  );
}

export default BookingTracker;
