// src/components/CheckReservation.jsx
import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useTranslation } from "react-i18next";
import SectionTitle from "../common/SectionTitle";
import {
  toILPhoneE164,
  isILPhoneE164,
  e164ToLocalPretty,
} from "../../utils/phone";

function CheckReservation() {
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleCheck = async () => {
    setResults([]);
    setNotFound(false);
    if (!phone) return;

    const p = toILPhoneE164(phone);
    if (!isILPhoneE164(p)) {
      setNotFound(true);
      return;
    }

    setLoading(true);
    try {
      const qy = query(
        collection(db, "bookings"),
        where("phoneNumber", "==", p),
        where("bookingCode", "!=", "") // فقط اللي معها كود
      );
      const querySnapshot = await getDocs(qy);

      if (querySnapshot.empty) {
        setNotFound(true);
      } else {
        const data = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (doc) =>
              doc.fullName &&
              doc.selectedDate &&
              doc.selectedTime &&
              doc.bookingCode
          );

        setResults(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-beige py-10 px-4 text-center font-body">
      <SectionTitle icon="🔍">
        {t("check_booking") || "تحقق من الحجز"}
      </SectionTitle>

      <input
        type="tel"
        placeholder={t("phone") || "رقم الهاتف"}
        className="p-2 rounded border border-gray-300 mb-4 w-full max-w-xs"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        onClick={handleCheck}
        disabled={loading || !phone}
        className={`bg-gold text-primary px-6 py-2 rounded-full font-semibold transition ${
          loading || !phone
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-darkText hover:text-light"
        }`}
      >
        {loading ? t("loading") || "جارٍ التحقق..." : t("check") || "تحقق"}
      </button>

      {notFound && (
        <p className="mt-4 text-red-600">
          {t("no_booking_found") || "لا يوجد حجوزات"}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map((result) => (
            <div
              key={result.id}
              className="bg-white rounded-lg shadow-md p-4 text-left border border-gray-200"
            >
              <p>
                <strong>{t("name") || "الاسم"}:</strong> {result.fullName}
              </p>
              <p>
                <strong>{t("phone") || "الهاتف"}:</strong>{" "}
                {e164ToLocalPretty(result.phoneNumber)}
              </p>
              <p>
                <strong>{t("select_date") || "التاريخ"}:</strong>{" "}
                {result.selectedDate}
              </p>
              <p>
                <strong>{t("choose_time") || "الساعة"}:</strong>{" "}
                {result.selectedTime}
              </p>
              <p>
                <strong>{t("choose_service") || "الخدمة"}:</strong>{" "}
                {result.selectedService}
              </p>
              <p>
                <strong>🔐 كود الحجز:</strong> {result.bookingCode || "-"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CheckReservation;
