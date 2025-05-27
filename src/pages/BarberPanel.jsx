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

const workingHours = {
  Sunday: null,
  Monday: null,
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
    const tempOptions = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);

      const dateISO = day.toISOString().slice(0, 10);

      const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const dayIndex = day.getDay();
      let label = dayNames[dayIndex];

      if (day.toDateString() === today.toDateString()) {
        label += " (اليوم)";
      } else if (day.toDateString() === tomorrow.toDateString()) {
        label += " (بكرا)";
      }

      tempOptions.push({ value: dateISO, label });
    }

    setOptions(tempOptions);
  }, []);

  return (
    <select
      value={selectedDate}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-md mb-6"
    >
      <option value="" disabled>اختر التاريخ</option>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}

function BarberPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [restoreMessage, setRestoreMessage] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const q = query(collection(db, "bookings"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };
    fetchBookings();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setBlockedTimes([]);
      return;
    }
    const fetchBlockedTimes = async () => {
      const ref = doc(db, "blockedTimes", selectedDate);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        setBlockedTimes(snapshot.data().times || []);
      } else {
        setBlockedTimes([]);
      }
      setSelectedTimes([]);
    };
    fetchBlockedTimes();
  }, [selectedDate]);

  const isTimeBooked = (time) =>
    bookings.some(
      (b) => b.selectedDate === selectedDate && b.selectedTime === time
    );

  const handleToggleTime = (time) => {
    if (isTimeBooked(time)) {
      alert("هذه الساعة محجوزة ولا يمكن تعديلها.");
      return;
    }
    if (blockedTimes.includes(time)) {
      const updated = blockedTimes.filter((t) => t !== time);
      setBlockedTimes(updated);
      const ref = doc(db, "blockedTimes", selectedDate);
      updateDoc(ref, { times: arrayRemove(time) });
      setRestoreMessage(t("time_restored_success"));
      setTimeout(() => setRestoreMessage(""), 2500);
    } else {
      setSelectedTimes((prev) =>
        prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
      );
    }
  };

  const handleRemoveTimes = async () => {
    if (!selectedDate || selectedTimes.length === 0) return;

    for (const time of selectedTimes) {
      if (isTimeBooked(time)) {
        alert(`لا يمكن حظر الساعة ${time} لأنها محجوزة.`);
        return;
      }
    }

    const ref = doc(db, "blockedTimes", selectedDate);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      await setDoc(ref, { times: selectedTimes });
    } else {
      for (const time of selectedTimes) {
        await updateDoc(ref, { times: arrayUnion(time) });
      }
    }
    setBlockedTimes([...blockedTimes, ...selectedTimes]);
    setSelectedTimes([]);
    alert(t("times_removed_success"));
  };

  const dayName = selectedDate ? getDayName(selectedDate) : "";
  const times =
    workingHours[dayName]?.from &&
    generateTimeSlots(workingHours[dayName].from, workingHours[dayName].to);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-24 font-body">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gold">{t("manage_times")}</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/admin-bookings")}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              {t("admin_bookings")}
            </button>
            <button
              onClick={() => navigate("/barber")}
              className="text-sm text-red-600 hover:text-red-800 font-semibold underline"
            >
              {t("logout")}
            </button>
          </div>
        </div>

        {restoreMessage && (
          <div className="mb-4 bg-green-100 text-green-800 border border-green-300 px-4 py-2 rounded text-sm text-center font-medium shadow-sm">
            {restoreMessage}
          </div>
        )}

        <label className="block mb-2 font-semibold text-gray-700">{t("select_date")}</label>

        <DateDropdown selectedDate={selectedDate} onChange={setSelectedDate} />

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-6"
          min={new Date().toISOString().slice(0, 10)}
        />

        {times ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
              {times.map((time) => {
                const booked = isTimeBooked(time);
                const isBlocked = blockedTimes.includes(time);
                const isSelected = selectedTimes.includes(time);

                return (
                  <button
                    key={time}
                    onClick={() => handleToggleTime(time)}
                    disabled={booked}
                    className={`py-2 px-3 rounded border font-medium text-sm transition
                      ${
                        booked
                          ? "bg-red-700 text-white border-red-800 cursor-not-allowed"
                          : isBlocked
                          ? "bg-red-300 text-red-800 border-red-500"
                          : isSelected
                          ? "bg-yellow-300 text-black border-yellow-500"
                          : "bg-green-100 text-green-800 border-green-300 hover:bg-yellow-200"
                      }
                    `}
                    title={
                      booked
                        ? "هذه الساعة محجوزة ولا يمكن تعديلها"
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
            {selectedTimes.length > 0 && (
              <button
                onClick={handleRemoveTimes}
                className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition"
              >
                {t("remove_selected_times")}
              </button>
            )}
          </>
        ) : (
          <p className="text-red-500 font-medium">{t("closed_day")}</p>
        )}
      </div>
    </div>
  );
}

export default BarberPanel;
