// ✅ BarberPanel.jsx - النسخة المعدلة لتسجيل خروج تلقائي بعد ساعتين من عدم النشاط
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
  getDocs,
} from "firebase/firestore";

// ساعات العمل
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
        "الأحد", "الإثنين", "الثلاثاء",
        "الأربعاء", "الخميس", "الجمعة", "السبت",
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
      <option value="" disabled>اختر التاريخ من القائمة</option>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>{label}</option>
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

  // ✅ ⏰ Auto-logout timer (ساعتين)
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem("barberUser");
        alert("⚠️ تم تسجيل الخروج بسبب عدم النشاط لمدة ساعتين.");
        navigate("/login");
      }, 2 * 60 * 60 * 1000); // ساعتين
    };
    resetTimer();

    // أي تفاعل => إعادة ضبط المؤقت
    const handleActivity = () => resetTimer();
    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const q = query(collection(db, "bookings"));
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setBookings(data);
      } catch (err) {
        console.error("خطأ بجلب الحجوزات:", err);
      }
    };
    fetchBookings();
  }, []);

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
      if (!snap.exists()) {
        await setDoc(ref, { times: [] });
      }
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

  return (
    <div className={`min-h-screen bg-gray-100 p-6 ${fontClass}`} dir="rtl">
      <div className="h-16"></div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between bg-white px-8 py-6 border-b">
          <h1 className="text-3xl font-semibold text-gray-800">إدارة الساعات</h1>
          <div className="mt-4 md:mt-0 flex space-x-6 space-x-reverse text-sm">
            <button
              onClick={() => navigate("/admin-bookings")}
              className="text-blue-600 hover:underline transition-colors"
            >
              لوحة الحجوزات
            </button>
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
          </div>
        </div>

        <div className="p-8">
          <label className="block mb-3 text-lg font-medium text-gray-700">اختر التاريخ</label>
          <DateDropdown selectedDate={selectedDate} onChange={setSelectedDate} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold transition mb-4"
            min={new Date().toISOString().split("T")[0]}
          />
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

        {selectedDate && times && (
          <div className="p-8 pt-4 border-t bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              الأوقات المتاحة:
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
              {times.map((time) => {
                const booked = isTimeBooked(time);
                const isBlocked = blockedTimes.includes(time);
                const isSelected = selectedTimes.includes(time);

                return (
                  <button
                    key={time}
                    onClick={() => handleToggleTime(time)}
                    disabled={booked}
                    className={`
                      py-2 rounded-xl text-sm font-medium text-center transition-all duration-200
                      ${booked ? "bg-red-700 text-white cursor-not-allowed"
                        : isBlocked ? "bg-red-200 text-red-800"
                        : isSelected ? "bg-yellow-300 text-gray-900 ring-2 ring-yellow-500"
                        : "bg-green-100 text-green-800 hover:bg-green-200"}
                    `}
                    title={booked ? "هذه الساعة محجوزة"
                      : isBlocked ? "هذه الساعة محظورة"
                      : "اضغط للحظر/الإلغاء"}
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
                {t("remove_selected_times")}
              </button>
            ) : (
              <p className="text-sm text-gray-500">
                اختر ساعة أو أكثر ثم اضغط لحظرها.
              </p>
            )}
          </div>
        )}
        {statusMessage && (
          <div className="p-4 bg-green-100 border border-green-300 text-green-800 text-center font-medium">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
