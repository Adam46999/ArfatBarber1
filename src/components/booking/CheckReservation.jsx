import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useTranslation } from "react-i18next";

function CheckReservation() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { t } = useTranslation();

  const handleCheck = async () => {
    setResult(null);
    setNotFound(false);
    if (!phone) return;

    const q = query(collection(db, "bookings"), where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setNotFound(true);
    } else {
      const data = querySnapshot.docs[0].data();
      setResult(data);
    }
  };

  return (
    <div className="bg-beige py-10 px-4 text-center font-body">
      <h2 className="text-2xl font-heading mb-4">{t("check_your_booking") || "בדוק את ההזמנה שלך"}</h2>

      <input
        type="tel"
        placeholder={t("phone") || "מספר טלפון"}
        className="p-2 rounded border border-gray-300 mb-4 w-full max-w-xs"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        onClick={handleCheck}
        className="bg-gold text-primary px-6 py-2 rounded-full font-semibold hover:bg-darkText hover:text-light transition"
      >
        {t("check") || "בדוק"}
      </button>

      {notFound && <p className="mt-4 text-red-600">{t("no_booking_found") || "לא נמצאה הזמנה"}</p>}

      {result && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-4 inline-block text-left">
          <p><strong>{t("name") || "שם"}:</strong> {result.name}</p>
          <p><strong>{t("phone") || "טלפון"}:</strong> {result.phone}</p>
          <p><strong>{t("select_date") || "תאריך"}:</strong> {result.date}</p>
          <p><strong>{t("choose_time") || "שעה"}:</strong> {result.time}</p>
          <p><strong>{t("choose_service") || "שירות"}:</strong> {result.service}</p>
        </div>
      )}
    </div>
  );
}

export default CheckReservation;
