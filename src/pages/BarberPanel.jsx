// src/pages/products/BarberPanel.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  onSnapshot, // ✅ تحديث لحظي للحجوزات
} from "firebase/firestore";
import { e164ToLocalPretty } from "../utils/phone";

const workingHours = {
  Sunday: null,
  Monday: { from: "12:00", to: "21:00" },
  Tuesday: { from: "12:00", to: "21:00" },
  Wednesday: { from: "12:00", to: "21:00" },
  Thursday: { from: "12:00", to: "22:00" },
  Friday: { from: "13:00", to: "23:30" },
  Saturday: { from: "11:00", to: "19:30" },
};

const generateTimeSlots = (from, to) => {
  const slots = [];
  const [fromHour, fromMinute] = from.split(":").map(Number);
  const [toHour, toMinute] = to.split(":").map(Number);
  let current = new Date();
  current.setHours(fromHour, fromMinute, 0, 0);
  const end = new Date();
  end.setHours(toHour, toMinute, 0, 0);

  while (current <= end) {
    slots.push(current.toTimeString().slice(0, 5));
    current.setMinutes(current.getMinutes() + 30);
  }
  return slots;
};

function getDayName(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function DateDropdown({ selectedDate, onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const temp = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const daysAr = [
        "الأحد",
        "الإثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ];
      let label = daysAr[d.getDay()];
      if (d.toDateString() === today.toDateString()) label += " (اليوم)";
      else if (d.toDateString() === tomorrow.toDateString()) label += " (بكرا)";

      temp.push({ value: iso, label });
    }
    setOptions(temp);
  }, []);

  return (
    <select
      value={selectedDate}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gold transition mb-4"
    >
      <option value="" disabled>
        اختر التاريخ من القائمة
      </option>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export default function BarberPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  const [selectedDate, setSelectedDate] = useState("");
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);

  // ⚙️ إعداد "حجز واحد لكل رقم في اليوم"
  const [limitOnePerDay, setLimitOnePerDay] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // حالة اليوم (مغلق / مفتوح)
  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      try {
        const ref = doc(db, "blockedDays", selectedDate);
        const snap = await getDoc(ref);
        setIsDayBlocked(snap.exists());
      } catch {
        setIsDayBlocked(false);
      }
    })();
  }, [selectedDate]);

  const toggleDay = async () => {
    if (!selectedDate) return;
    setLoadingBlock(true);
    const ref = doc(db, "blockedDays", selectedDate);
    try {
      if (isDayBlocked) {
        await deleteDoc(ref);
        setIsDayBlocked(false);
      } else {
        const bookingsSnap = await getDocs(
          query(
            collection(db, "bookings"),
            where("selectedDate", "==", selectedDate)
          )
        );
        const activeBookings = bookingsSnap.docs.filter(
          (doc) => !doc.data().cancelledAt
        );
        if (activeBookings.length > 0) {
          alert("⚠️ لا يمكن تعطيل هذا اليوم لأن هناك حجوزات لم يتم إلغاؤها.");
          return;
        }
        await setDoc(ref, {});
        setIsDayBlocked(true);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingBlock(false);
  };

  // ⏰ تسجيل خروج تلقائي بعد ساعتين عدم نشاط
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem("barberUser");
        alert("⚠️ تم تسجيل الخروج بسبب عدم النشاط لمدة ساعتين.");
        navigate("/login");
      }, 2 * 60 * 60 * 1000);
    };
    resetTimer();
    const handleActivity = () => resetTimer();
    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [navigate]);

  // ✅ جلب جميع الحجوزات لحظيًا (Real-time)
  useEffect(() => {
    const q = query(collection(db, "bookings"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setBookings(data);
      },
      (err) => {
        console.error("خطأ بجلب الحجوزات (onSnapshot):", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // جلب إعداد "حجز واحد لكل رقم في اليوم"
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const ref = doc(db, "barberSettings", "global");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const value =
            typeof data.limitOneBookingPerDayPerPhone === "boolean"
              ? data.limitOneBookingPerDayPerPhone
              : !!data.limitOneBookingPerDay;
          setLimitOnePerDay(value);
        } else {
          setLimitOnePerDay(false);
        }
      } catch (err) {
        console.error("خطأ بجلب إعدادات الحلاق:", err);
        setLimitOnePerDay(false);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggleLimitOnePerDay = async () => {
    if (loadingSettings || savingSettings) return;
    try {
      setSavingSettings(true);
      const ref = doc(db, "barberSettings", "global");
      await setDoc(
        ref,
        { limitOneBookingPerDayPerPhone: !limitOnePerDay },
        { merge: true }
      );
      setLimitOnePerDay((prev) => !prev);
    } catch (err) {
      console.error("خطأ بتحديث إعداد حجز واحد لليوم:", err);
      alert("حدث خطأ أثناء تحديث الإعداد. حاول مرة أخرى.");
    } finally {
      setSavingSettings(false);
    }
  };

  // الأوقات المحظورة
  useEffect(() => {
    if (!selectedDate) {
      setBlockedTimes([]);
      setSelectedTimes([]);
      setStatusMessage("");
      return;
    }
    const fetchBlocked = async () => {
      try {
        const ref = doc(db, "blockedTimes", selectedDate);
        const snap = await getDoc(ref);
        if (snap.exists()) setBlockedTimes(snap.data().times || []);
        else setBlockedTimes([]);
        setSelectedTimes([]);
        setStatusMessage("");
      } catch (err) {
        console.error("خطأ بجلب الأوقات المحظورة:", err);
        setBlockedTimes([]);
      }
    };
    fetchBlocked();
  }, [selectedDate]);

  const isTimeBooked = (time) =>
    bookings.some(
      (b) => b.selectedDate === selectedDate && b.selectedTime === time
    );

  const handleToggleTime = async (time) => {
    if (isTimeBooked(time)) {
      setStatusMessage("هذه الساعة محجوزة ولا يمكن تعديلها.");
      return;
    }

    if (blockedTimes.includes(time)) {
      const updated = blockedTimes.filter((t) => t !== time);
      setBlockedTimes(updated);
      try {
        const ref = doc(db, "blockedTimes", selectedDate);
        await updateDoc(ref, { times: arrayRemove(time) });
        setStatusMessage("✅ تم استرجاع الساعة بنجاح");
      } catch (err) {
        console.error("خطأ باسترجاع الساعة:", err);
        setStatusMessage("حدث خطأ، حاول مرة أخرى.");
      }
      setTimeout(() => setStatusMessage(""), 2500);
      return;
    }

    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
    setStatusMessage("");
  };

  const handleApplyBlock = async () => {
    if (!selectedDate || selectedTimes.length === 0) {
      setStatusMessage("اختر ساعة واحدة على الأقل للحظر.");
      return;
    }

    for (const time of selectedTimes) {
      if (isTimeBooked(time)) {
        setStatusMessage(`الساعة ${time} محجوزة.`);
        return;
      }
    }

    try {
      const ref = doc(db, "blockedTimes", selectedDate);
      const snap = await getDoc(ref);
      if (!snap.exists()) await setDoc(ref, { times: [] });
      for (const time of selectedTimes) {
        await updateDoc(ref, { times: arrayUnion(time) });
      }
      setBlockedTimes([...blockedTimes, ...selectedTimes]);
      setSelectedTimes([]);
      setStatusMessage("✅ تم حظر الأوقات بنجاح");
    } catch (err) {
      console.error("خطأ بتطبيق الحظر:", err);
      setStatusMessage("حدث خطأ، حاول مرة أخرى.");
    }
    setTimeout(() => setStatusMessage(""), 2500);
  };

  const dayName = selectedDate ? getDayName(selectedDate) : "";
  const times =
    workingHours[dayName]?.from &&
    generateTimeSlots(workingHours[dayName].from, workingHours[dayName].to);

  const now = new Date();
  const todayStr = now.toLocaleDateString("sv-SE"); // "YYYY-MM-DD"
  const isToday = selectedDate === todayStr;

  let filteredTimes = times;
  if (isToday && times) {
    filteredTimes = times.filter((time) => {
      const slotTime = new Date(`${selectedDate}T${time}:00`);
      return slotTime > now;
    });
  }

  // 🔍 ترتيب "أحدث الحجوزات" حسب وقت إنشاء الحجز فعليًا
  const getBookingCreationDate = (b) => {
    // لو createdAt من Firestore (Timestamp)
    if (b.createdAt && typeof b.createdAt.toDate === "function") {
      return b.createdAt.toDate();
    }

    // لو مخزن كـ Date عادي
    if (b.createdAt instanceof Date) {
      return b.createdAt;
    }

    // احتياط: نرجع لموعد الحجز نفسه
    try {
      if (b.selectedDate && b.selectedTime) {
        return new Date(`${b.selectedDate}T${b.selectedTime}:00`);
      }
    } catch {
      // ignore parse errors
    }

    // قديم جدًا
    return new Date(0);
  };

  const activeBookings = bookings.filter((b) => !b.cancelledAt);

  // 🎯 أحدث 5 حجوزات حسب وقت إنشاء الحجز
  const recentBookings = [...activeBookings]
    .sort((a, b) => getBookingCreationDate(a) - getBookingCreationDate(b))
    .slice(-5) // آخر 5 (الأحدث)
    .reverse(); // نخلي الأحدث أول واحد

  return (
    <div className={`min-h-screen bg-gray-100 p-6 ${fontClass}`} dir="rtl">
      <div className="h-16"></div>

      {/* اللوحة الرئيسية لإدارة الساعات */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between bg-white px-8 py-6 border-b">
          <h1 className="text-3xl font-semibold text-gray-800">
            إدارة الساعات
          </h1>
          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => navigate("/admin-bookings")}
              className="text-blue-600 hover:underline transition-colors"
            >
              لوحة الحجوزات
            </button>
            <Link
              to="/blocked-phones"
              className="text-yellow-700 hover:underline transition-colors"
            >
              الأرقام المحظورة
            </Link>
            <button
              onClick={() => {
                if (window.confirm("هل أنت متأكد أنك تريد تسجيل الخروج؟")) {
                  localStorage.removeItem("barberUser");
                  navigate("/login");
                }
              }}
              className="text-red-600 hover:underline transition-colors"
            >
              تسجيل الخروج
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-green-700 hover:underline transition-colors"
            >
              الإحصائيات
            </button>
          </div>
        </div>

        {/* اختيار التاريخ + حالة اليوم */}
        <div className="p-8">
          <label className="block mb-3 text-lg font-medium text-gray-700">
            اختر التاريخ
          </label>
          <DateDropdown
            selectedDate={selectedDate}
            onChange={setSelectedDate}
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold transition mb-4"
            min={new Date().toISOString().split("T")[0]}
          />

          {selectedDate && (
            <div className="flex items-center justify-between mb-4">
              <span>حالة اليوم:</span>
              <button
                onClick={toggleDay}
                disabled={loadingBlock}
                className={`px-4 py-2 rounded text-white font-semibold transition ${
                  isDayBlocked
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {loadingBlock
                  ? "جاري..."
                  : isDayBlocked
                  ? "تفعيل اليوم"
                  : "تعطيل اليوم"}
              </button>
            </div>
          )}

          {!selectedDate && (
            <p className="mt-2 text-sm text-gray-500">
              يمكنك استخدام القائمة أو التقويم لاختيار أي تاريخ.
            </p>
          )}
          {selectedDate && !times && (
            <p className="mt-3 text-sm text-red-600 font-medium">
              هذا اليوم مغلق
            </p>
          )}
        </div>

        {selectedDate && times && !isDayBlocked && (
          <div className="p-8 pt-4 border-t bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              الأوقات المتاحة:
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
              {filteredTimes.map((time) => {
                const booked = bookings.some(
                  (b) =>
                    b.selectedDate === selectedDate && b.selectedTime === time
                );
                const isBlocked = blockedTimes.includes(time);
                const isSelected = selectedTimes.includes(time);

                return (
                  <button
                    key={time}
                    onClick={() => handleToggleTime(time)}
                    disabled={booked}
                    className={`py-2 rounded-xl text-sm font-medium text-center transition-all duration-200 ${
                      booked
                        ? "bg-red-700 text-white cursor-not-allowed"
                        : isBlocked
                        ? "bg-red-200 text-red-800"
                        : isSelected
                        ? "bg-yellow-300 text-gray-900 ring-2 ring-yellow-500"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                    title={
                      booked
                        ? "هذه الساعة محجوزة"
                        : isBlocked
                        ? "هذه الساعة محظورة"
                        : "اضغط للحظر/الإلغاء"
                    }
                  >
                    {time}
                  </button>
                );
              })}
            </div>
            {selectedTimes.length > 0 ? (
              <button
                onClick={handleApplyBlock}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {t("remove_selected_times") ||
                  "تطبيق الحظر على الساعات المحددة"}
              </button>
            ) : (
              <p className="text-sm text-gray-500">
                اختر ساعة أو أكثر ثم اضغط لحظرها.
              </p>
            )}
          </div>
        )}

        {selectedDate && isDayBlocked && (
          <div className="p-8 pt-4 border-t bg-yellow-50 text-center text-red-600 font-semibold text-lg">
            تم تعطيل هذا اليوم بالكامل. لا يمكن تعديل أو حظر الساعات حتى يتم
            تفعيله من جديد.
          </div>
        )}

        {statusMessage && (
          <div className="p-4 bg-green-100 border border-green-300 text-green-800 text-center font-medium">
            {statusMessage}
          </div>
        )}
      </div>

      {/* عرض سريع للحجوزات الأخيرة – شكل احترافي وواضح */}
      {recentBookings.length > 0 && (
        <div className="max-w-3xl mx-auto mt-6 text-xs sm:text-sm">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 text-slate-900">
            {/* العنوان */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-slate-900">
                    أحدث الحجوزات (رقم موحّد)
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    آخر {recentBookings.length} حجوزات فعّالة
                  </span>
                </div>
              </div>
            </div>

            {/* القائمة */}
            <div className="mt-2 border-t border-slate-100 divide-y divide-slate-100">
              {recentBookings.map((b, idx) => (
                <div
                  key={b.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 rounded-xl px-2"
                >
                  {/* الاسم + التاريخ والساعة */}
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-[11px] text-slate-500">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 text-sm sm:text-base">
                        {b.fullName || "بدون اسم"}
                      </span>
                      <div className="mt-1 inline-flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-0.5 border border-amber-200 text-amber-800">
                          {b.selectedDate || "—"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-0.5 border border-sky-200 text-sky-700">
                          {b.selectedTime || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* رقم الهاتف */}
                  <div className="flex items-center gap-2 sm:justify-end sm:min-w-[150px] text-[11px] sm:text-xs">
                    <span className="text-slate-500">الرقم الموحّد:</span>
                    <span className="font-mono text-sm text-slate-900">
                      {e164ToLocalPretty(b.phoneNumber)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ كرت إعداد "حجز واحد لكل رقم / يوم" – في آخر الصفحة */}
      <div className="max-w-3xl mx-auto mt-6">
        <div className="bg-white rounded-2xl shadow p-4 border border-gray-200 text-center">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            وضع حجز واحد لكل رقم / يوم
          </h2>
          <div className="flex items-center justify-center gap-4 mb-2">
            {/* النص على اليمين */}
            <span className="text-xs font-semibold text-gray-700">
              {limitOnePerDay ? "مُفَعَّل" : "مُعَطَّل"}
            </span>

            {/* السويتش */}
            <button
              type="button"
              onClick={handleToggleLimitOnePerDay}
              disabled={loadingSettings || savingSettings}
              className="disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div
                className={`relative w-16 h-8 rounded-full transition-colors flex items-center ${
                  limitOnePerDay ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                {/* الدائرة */}
                <div
                  className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-md transition-transform ${
                    limitOnePerDay ? "translate-x-8" : "translate-x-0"
                  }`}
                ></div>
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {limitOnePerDay
              ? "مُفعَّل: لا يمكن لنفس الرقم حجز أكثر من موعد في نفس اليوم."
              : "مُعطَّل: يمكن لنفس الرقم حجز أكثر من موعد في نفس اليوم."}
          </p>
        </div>
      </div>
    </div>
  );
}
