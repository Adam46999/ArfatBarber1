// src/components/booking/BookingTracker.jsx
import { useState } from "react";
import { db } from "../../firebase";
import SectionTitle from "../common/SectionTitle";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  Phone,
  Clock3,
  CalendarDays,
  Scissors,
} from "lucide-react";
import {
  toILPhoneE164,
  isILPhoneE164,
  e164ToLocalPretty,
  normalizeDigits,
} from "../../utils/phone";

// ✅ بدل deleteDoc: استخدم الإلغاء الصحيح اللي بنقص العداد الشهري
import { cancelBooking } from "../../services/bookingService";

const CANCELLATION_WINDOW_MIN = 50;

/* ============================
   Helpers
   ============================ */

function diffMinutes(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / 60000);
}

function getStartAtDate(booking) {
  if (!booking) return null;

  if (booking?.startAt?.toDate) {
    const d = booking.startAt.toDate();
    return d instanceof Date && !isNaN(d) ? d : null;
  }

  if (booking?.selectedDate && booking?.selectedTime) {
    const d = new Date(`${booking.selectedDate}T${booking.selectedTime}:00`);
    return d instanceof Date && !isNaN(d) ? d : null;
  }

  return null;
}

function isBookingActiveNow(booking) {
  if (!booking || booking.cancelledAt) return false;
  const d = getStartAtDate(booking);
  if (!d) return false;
  return d.getTime() > Date.now();
}

function canCancelFixed(startAtDate) {
  if (!(startAtDate instanceof Date) || isNaN(startAtDate)) {
    return { ok: false, reason: "بيانات الموعد غير صالحة." };
  }

  const left = diffMinutes(new Date(), startAtDate);

  if (left < 0) {
    return { ok: false, reason: "لا يمكن الإلغاء: موعد الحجز انتهى بالفعل." };
  }

  if (left < CANCELLATION_WINDOW_MIN) {
    return {
      ok: false,
      reason: `لا يمكن الإلغاء: تبقّى أقل من ${CANCELLATION_WINDOW_MIN} دقيقة على موعدك.`,
    };
  }

  return { ok: true };
}

// تنسيق التاريخ + اسم اليوم بالعربي
function formatDayAndDate(dateYMD) {
  if (!dateYMD) return "";
  const d = new Date(`${dateYMD}T00:00:00`);
  if (!(d instanceof Date) || isNaN(d)) return dateYMD;

  const weekdayNames = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];
  const dayName = weekdayNames[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dayName} ${dd}-${mm}-${yyyy}`;
}

/* ============================
   Component
   ============================ */

function BookingTracker() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [codeInputs, setCodeInputs] = useState({});
  const [errorMessages, setErrorMessages] = useState({});

  const align = "text-right";

  const handleCheck = async () => {
    setResults([]);
    setNotFound(false);
    setSuccessMessage("");
    setErrorMessages({});

    const input = phone.trim();
    if (!input) return;

    const localNumber = normalizeDigits(input); // 050...
    const phoneE164 = toILPhoneE164(input); // +972...
    const hasValidE164 = isILPhoneE164(phoneE164);

    setLoading(true);
    try {
      const byId = {};

      if (hasValidE164) {
        const q1 = query(
          collection(db, "bookings"),
          where("phoneNumber", "==", phoneE164)
        );
        const snap1 = await getDocs(q1);
        snap1.forEach((d) => {
          byId[d.id] = { docId: d.id, ...d.data() };
        });
      }

      if (localNumber) {
        const q2 = query(
          collection(db, "bookings"),
          where("phoneNumber", "==", localNumber)
        );
        const snap2 = await getDocs(q2);
        snap2.forEach((d) => {
          byId[d.id] = { docId: d.id, ...d.data() };
        });
      }

      const rawData = Object.values(byId);
      const activeBookings = rawData.filter(isBookingActiveNow);

      if (activeBookings.length === 0) {
        setNotFound(true);
      } else {
        setResults(activeBookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setNotFound(true);
    }
    setLoading(false);
  };

  const handleCancel = async (booking) => {
    const code = codeInputs[booking.docId] || "";
    if (!code || code !== booking.bookingCode) {
      setErrorMessages((prev) => ({
        ...prev,
        [booking.docId]: "رمز التحقق غير صحيح",
      }));
      return;
    }

    if (!isBookingActiveNow(booking)) {
      setErrorMessages((prev) => ({
        ...prev,
        [booking.docId]: "هذا الحجز لم يعد فعّالاً، لا يمكن إلغاؤه.",
      }));
      return;
    }

    const startAtDate = getStartAtDate(booking);
    const check = canCancelFixed(startAtDate);
    if (!check.ok) {
      setErrorMessages((prev) => ({ ...prev, [booking.docId]: check.reason }));
      return;
    }

    try {
      // ✅ الإلغاء الصحيح (بيحط cancelledAt وبيعمل decrement للعداد الشهري)
      await cancelBooking(booking.docId);

      setResults((prev) => prev.filter((b) => b.docId !== booking.docId));
      setSuccessMessage("✅ تم إلغاء الحجز بنجاح");
    } catch (error) {
      console.error("Error while cancelling:", error);
      alert("حدث خطأ أثناء محاولة الإلغاء.");
    }
  };

  return (
    <section dir="rtl" className="bg-white py-14 px-4 text-primary font-body">
      {/* العنوان */}
      <SectionTitle
        icon={
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/15 text-gold shadow-sm">
            <CalendarCheck className="w-6 h-6" />
          </div>
        }
      >
        <span className="tracking-wide text-lg font-semibold">
          {t("check_booking", { defaultValue: "تحقّق من الحجز" })}
        </span>
      </SectionTitle>

      {/* الصندوق الرئيسي */}
      <div className="max-w-xl mx-auto bg-[#fcfaf7] border border-gold/20 rounded-3xl shadow-lg p-6 md:p-8 mt-6 backdrop-blur-sm">
        {/* إدخال الرقم + زر التحقق */}
        <div className="flex flex-row-reverse gap-3 items-center">
          <input
            type="tel"
            placeholder={t("phone", { defaultValue: "رقم الهاتف" })}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold shadow-sm bg-white ${align}`}
          />
          <button
            onClick={handleCheck}
            disabled={loading || !phone.trim()}
            className={`rounded-2xl px-6 py-3 font-bold shadow-sm transition ${
              loading || !phone.trim()
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gold text-primary hover:bg-yellow-400"
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

        {/* رسائل */}
        {successMessage && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-right shadow-sm">
            {successMessage}
          </div>
        )}

        {notFound && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-right shadow-sm">
            {t("no_booking_found", {
              defaultValue: "لا يوجد حجز فعّال مرتبط بهذا الرقم.",
            })}
          </div>
        )}

        {/* النتائج */}
        {results.length > 0 && (
          <div className="mt-6 space-y-6">
            {results.map((booking) => {
              const prettyDate = formatDayAndDate(booking.selectedDate);

              const serviceTitle = t(`service_${booking.selectedService}`, {
                defaultValue: booking.selectedService || "—",
              });

              return (
                <div
                  key={booking.docId}
                  className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl transition-all"
                  dir="rtl"
                >
                  {/* الهيدر */}
                  <div className="flex flex-row-reverse justify-between items-start mb-6">
                    {/* يمين: الاسم + الهاتف فقط */}
                    <div className="space-y-3 text-right w-full">
                      <div className="text-xl font-extrabold text-gray-900 leading-tight">
                        {booking.fullName || "بدون اسم"}
                      </div>

                      <div className="flex flex-row-reverse items-center gap-2 text-sm text-gray-700">
                        <Phone className="w-4 h-4 opacity-70" />
                        <span>
                          {t("phone", { defaultValue: "رقم الهاتف" })}:{" "}
                          {e164ToLocalPretty(booking.phoneNumber)}
                        </span>
                      </div>
                    </div>

                    {/* يسار: بادج */}
                    <span className="px-4 py-1 text-sm rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm whitespace-nowrap">
                      {t("active_booking", { defaultValue: "حجز نشط" })}
                    </span>
                  </div>

                  {/* Grid المعلومات */}
                  <div className="grid grid-cols-1 gap-3 mb-6">
                    <InfoRow
                      label={t("service", { defaultValue: "الخدمة" })}
                      value={serviceTitle}
                      icon={<Scissors className="w-4 h-4 opacity-70" />}
                    />
                    <InfoRow
                      label={t("time", { defaultValue: "الساعة" })}
                      value={booking.selectedTime}
                      icon={<Clock3 className="w-4 h-4 opacity-70" />}
                    />
                    <InfoRow
                      label={t("date", { defaultValue: "التاريخ" })}
                      value={prettyDate}
                      icon={<CalendarDays className="w-4 h-4 opacity-70" />}
                    />
                  </div>

                  {/* إدخال الكود */}
                  <div className="space-y-2 text-right">
                    <label className="block text-sm font-semibold">
                      {t("enter_code", {
                        defaultValue: "أدخل رمز التحقق لإلغاء الحجز",
                      })}
                    </label>
                    <input
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      value={codeInputs[booking.docId] || ""}
                      onChange={(e) =>
                        setCodeInputs((prev) => ({
                          ...prev,
                          [booking.docId]: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-right shadow-sm focus:ring-2 focus:ring-gold bg-white"
                      placeholder={t("enter_code", {
                        defaultValue: "أدخل الكود",
                      })}
                    />

                    {errorMessages[booking.docId] && (
                      <p className="text-red-600 text-sm mt-1">
                        {errorMessages[booking.docId]}
                      </p>
                    )}
                  </div>

                  {/* زر الإلغاء */}
                  <div className="flex justify-start mt-5">
                    <button
                      onClick={() => handleCancel(booking)}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm"
                    >
                      {t("cancel_booking", { defaultValue: "إلغاء الحجز" })}
                    </button>
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

function InfoRow({ label, value, icon }) {
  return (
    <div
      className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-1 text-right shadow-sm"
      dir="rtl"
    >
      <div className="text-xs text-gray-500 flex flex-row-reverse items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-base font-semibold text-gray-900">
        {value || "—"}
      </div>
    </div>
  );
}

export default BookingTracker;
