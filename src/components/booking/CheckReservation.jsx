// src/components/booking/CheckReservation.jsx
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
import {
  Phone,
  CalendarDays,
  Clock3,
  Scissors,
  ShieldCheck,
} from "lucide-react";

function InfoRow({ label, value, icon }) {
  return (
    <div
      className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-1 text-right"
      dir="rtl"
    >
      <div className="text-xs text-gray-500 flex flex-row-reverse items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-bold text-gray-900">{value || "-"}</div>
    </div>
  );
}

export default function CheckReservation() {
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
        where("bookingCode", "!=", ""),
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
              doc.bookingCode,
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
    <section className="bg-beige py-12 px-4 font-body">
      <div className="max-w-2xl mx-auto">
        <SectionTitle icon="🔎">
          {t("check_booking") || "تحقق من الحجز"}
        </SectionTitle>

        <p className="text-center text-sm text-gray-600 mt-2">
          أدخل رقم هاتفك لعرض حجوزاتك. احتفظ بالكود لأنه مهم للتحقق أو الإلغاء.
        </p>

        {/* Card */}
        <div
          className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
          dir="rtl"
        >
          {/* Header mini */}
          <div className="flex flex-row-reverse items-center justify-between gap-3 mb-4">
            <div className="flex flex-row-reverse items-center gap-2">
              <ShieldCheck className="w-5 h-5 opacity-70" />
              <span className="font-extrabold text-gray-900">متابعة الحجز</span>
            </div>
            <span className="px-3 py-1 text-xs rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              خطوة 1
            </span>
          </div>

          {/* Phone input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              {t("phone") || "رقم الهاتف"}
            </label>

            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone className="w-4 h-4" />
              </span>

              <input
                type="tel"
                placeholder="مثال: 05X-XXXXXXX"
                className="w-full border border-gray-300 rounded-2xl pr-11 pl-4 py-3 text-right shadow-sm focus:ring-2 focus:ring-gold bg-white"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button
              onClick={handleCheck}
              disabled={loading || !phone}
              className={`w-full mt-2 bg-gold text-primary py-3 rounded-2xl font-extrabold transition ${
                loading || !phone
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-darkText hover:text-light"
              }`}
            >
              {loading
                ? t("loading") || "جارٍ التحقق..."
                : t("check") || "تحقق"}
            </button>

            {notFound && (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-right text-rose-700">
                {t("no_booking_found") ||
                  "لا يوجد حجوزات لهذا الرقم (أو الرقم غير صحيح)."}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            {results.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
                dir="rtl"
              >
                <div className="flex flex-row-reverse justify-between items-start mb-4">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-gray-900">
                      {r.fullName}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      {e164ToLocalPretty(r.phoneNumber)}
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    حجز
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <InfoRow
                    label="الخدمة"
                    value={r.selectedService}
                    icon={<Scissors className="w-4 h-4 opacity-70" />}
                  />
                  <InfoRow
                    label="الساعة"
                    value={r.selectedTime}
                    icon={<Clock3 className="w-4 h-4 opacity-70" />}
                  />
                  <InfoRow
                    label="التاريخ"
                    value={r.selectedDate}
                    icon={<CalendarDays className="w-4 h-4 opacity-70" />}
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-right">
                  <div className="text-xs text-gray-500 mb-1">🔐 كود الحجز</div>
                  <div className="text-xl font-black font-mono tracking-widest text-gray-900">
                    {r.bookingCode || "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
