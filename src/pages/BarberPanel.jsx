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
  where,
  getDocs,
} from "firebase/firestore";

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

async function isTimeBooked(date, time) {
  const q = query(
    collection(db, "bookings"),
    where("selectedDate", "==", date),
    where("selectedTime", "==", time)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

function BarberPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [restoreMessage, setRestoreMessage] = useState("");

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
    };
    fetchBlockedTimes();
  }, [selectedDate]);

  const handleToggleTime = async (time) => {
    if (!selectedDate) return;

    if (blockedTimes.includes(time)) {
      const isBooked = await isTimeBooked(selectedDate, time);
      if (isBooked) {
        alert("لا يمكنك إلغاء ساعة محجوزة بالفعل.");
        return;
      }

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
              onClick={() => navigate("/")}
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

        <label className="block mb-2 font-semibold text-gray-700">
          {t("select_date")}
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelectedTimes([]);
          }}
          className="w-full p-2 border border-gray-300 rounded mb-6"
        />

        {times ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
              {times.map((time) => (
                <button
                  key={time}
                  onClick={() => handleToggleTime(time)}
                  className={`py-2 px-3 rounded border font-medium text-sm transition ${
                    blockedTimes.includes(time)
                      ? "bg-red-200 text-red-700 border-red-400"
                      : selectedTimes.includes(time)
                      ? "bg-yellow-300 text-black border-yellow-500"
                      : "bg-green-100 text-green-800 border-green-300 hover:bg-yellow-200"
                  }`}
                >
                  {time}
                </button>
              ))}
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
