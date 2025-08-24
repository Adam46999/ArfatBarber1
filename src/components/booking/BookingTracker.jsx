import { useState } from "react";
import { db } from "../../firebase";
import SectionTitle from "../common/SectionTitle";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { CalendarCheck } from "lucide-react";
// === حارس إلغاء ثابت: 50 دقيقة ===
const CANCELLATION_WINDOW_MIN = 50;

function diffMinutes(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / 60000);
}

function canCancelFixed(startAtDate) {
  if (!(startAtDate instanceof Date) || isNaN(startAtDate)) {
    return { ok: false, reason: "بيانات الموعد غير صالحة." };
  }
  const now = new Date();
  const left = diffMinutes(now, startAtDate);
  if (left < CANCELLATION_WINDOW_MIN) {
    return {
      ok: false,
      reason: `لا يمكن الإلغاء: تبقّى أقل من ${CANCELLATION_WINDOW_MIN} دقيقة على موعدك.`,
    };
  }
  return { ok: true };
}

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
      const q = query(
        collection(db, "bookings"),
        where("phoneNumber", "==", phone)
      );
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
    // تحقق من الرمز
    const code = codeInputs[booking.docId] || "";
    if (!code || code !== booking.bookingCode) {
      setErrorMessages((prev) => ({
        ...prev,
        [booking.docId]: t("wrong_code", {
          defaultValue: "رمز التحقق غير صحيح",
        }),
      }));
      return;
    }

    // منع إلغاء حجز مُلغى أصلاً (اختياري)
    if (booking.cancelledAt) {
      setErrorMessages((prev) => ({
        ...prev,
        [booking.docId]: "هذا الحجز مُلغى بالفعل.",
      }));
      return;
    }

    // تحديد وقت الموعد:
    // 1) إن وُجد startAt (Firestore Timestamp) نستخدمه
    // 2) وإلا نبنيه محليًا من selectedDate + selectedTime (بدون UTC)
    let startAtDate = null;
    try {
      if (booking?.startAt?.toDate) {
        startAtDate = booking.startAt.toDate();
      } else if (booking?.selectedDate && booking?.selectedTime) {
        // يبني تاريخًا محليًا مثل "2025-08-24T13:30:00"
        startAtDate = new Date(
          `${booking.selectedDate}T${booking.selectedTime}:00`
        );
      }
    } catch {
      // يظل startAtDate = null -> سيعطي رسالة "بيانات الموعد غير صالحة."
    }

    // فحص حد الـ 50 دقيقة
    const check = canCancelFixed(startAtDate);
    if (!check.ok) {
      setErrorMessages((prev) => ({
        ...prev,
        [booking.docId]: check.reason,
      }));
      return;
    }

    // تنفيذ الإلغاء (حذف الوثيقة كما كان بس)
    try {
      await deleteDoc(doc(db, "bookings", booking.docId));
      setResults((prev) => prev.filter((b) => b.docId !== booking.docId));
      setSuccessMessage(
        t("booking_canceled", { defaultValue: "✅ تم إلغاء الحجز بنجاح" })
      );
    } catch (error) {
      console.error("Error while cancelling:", error);
      alert("حدث خطأ أثناء محاولة الإلغاء.");
    }
  };

  return (
    <section className="bg-white py-14 px-4 text-primary font-body">
      {/* العنوان */}
      <SectionTitle
        icon={
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/10 text-gold">
            <CalendarCheck className="w-6 h-6" />
          </div>
        }
      >
        <span className="ml-2 tracking-wide">
          {t("check_booking", { defaultValue: "تحقّق من الحجز" })}
        </span>
      </SectionTitle>

      {/* صندوق الإدخال */}
      <div className="max-w-xl mx-auto bg-[#faf8f4] border border-gold/30 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex gap-3 items-center">
          <input
            type="tel"
            placeholder={t("phone", { defaultValue: "رقم الهاتف" })}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold/70 shadow-sm bg-white"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !phone}
            className={`whitespace-nowrap rounded-xl px-5 py-3 font-semibold transition shadow-sm
              ${
                loading || !phone
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-gold text-primary hover:opacity-90"
              }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                {t("loading", { defaultValue: "جارٍ التحقق..." })}
              </span>
            ) : (
              t("check", { defaultValue: "تحقّق" })
            )}
          </button>
        </div>

        {/* رسائل عامة */}
        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">
            {successMessage}
          </div>
        )}
        {notFound && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {t("no_booking_found", {
              defaultValue: "لا يوجد حجز مرتبط بهذا الرقم.",
            })}
          </div>
        )}

        {/* النتائج */}
        {results.length > 0 && (
          <>
            <div className="mt-6 text-sm text-gray-600">
              {t("results_count", {
                count: results.length,
                defaultValue: `عدد النتائج: ${results.length}`,
              })}
            </div>

            <div className="mt-3 space-y-4">
              {results.map((booking) => (
                <div
                  key={booking.docId}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition"
                >
                  {/* رأس البطاقة */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-base font-bold text-gray-900">
                        {booking.fullName || "بدون اسم"}
                      </div>
                      <div className="text-sm text-gray-700">
                        {t("phone", { defaultValue: "الهاتف" })}:{" "}
                        {booking.phoneNumber}
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800">
                      {t("active_booking", { defaultValue: "حجز نشط" })}
                    </span>
                  </div>

                  {/* التفاصيل */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <InfoRow
                      label={t("date", { defaultValue: "التاريخ" })}
                      value={booking.selectedDate}
                    />
                    <InfoRow
                      label={t("time", { defaultValue: "الساعة" })}
                      value={booking.selectedTime}
                    />
                    <InfoRow
                      label={t("service", { defaultValue: "الخدمة" })}
                      value={t(`service_${booking.selectedService}`, {
                        defaultValue: booking.selectedService || "—",
                      })}
                    />
                  </div>

                  {/* إدخال رمز الإلغاء */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold mb-1">
                      {t("enter_code", {
                        defaultValue: "أدخل رمز التحقق لإلغاء الحجز",
                      })}
                    </label>
                    <input
                      type="text"
                      value={codeInputs[booking.docId] || ""}
                      onChange={(e) =>
                        setCodeInputs((prev) => ({
                          ...prev,
                          [booking.docId]: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold/70 bg-white"
                      placeholder={t("enter_code", {
                        defaultValue: "رمز التحقق",
                      })}
                    />
                    {errorMessages[booking.docId] && (
                      <p className="text-red-600 mt-2 text-xs font-semibold">
                        {errorMessages[booking.docId]}
                      </p>
                    )}
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleCancel(booking)}
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h4V4a1 1 0 0 1 1-1zm1 2v0h4V5h-4zm-2 5h2v8H8V10zm6 0h2v8h-2V10z" />
                      </svg>
                      {t("cancel_booking", { defaultValue: "إلغاء الحجز" })}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* عنصر صغير للعرض المنسق */
function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value || "—"}</div>
    </div>
  );
}

export default BookingTracker;
