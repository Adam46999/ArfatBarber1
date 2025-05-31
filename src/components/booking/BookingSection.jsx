import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
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

function generateTimeSlots(from, to) {
  const slots = [];
  const [fromHour, fromMinute] = from.split(":").map(Number);
  const [toHour, toMinute] = to.split(":").map(Number);
  const current = new Date();
  current.setHours(fromHour, fromMinute, 0, 0);
  const end = new Date();
  end.setHours(toHour, toMinute, 0, 0);
  while (current <= end) {
    const time = current.toTimeString().slice(0, 5);
    slots.push(time);
    current.setMinutes(current.getMinutes() + 30);
  }
  return slots;
}

function isOpenNow() {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayHours = workingHours[day];
  if (!todayHours) return false;
  const [fromHour, fromMinute] = todayHours.from.split(":").map(Number);
  const [toHour, toMinute] = todayHours.to.split(":").map(Number);
  const fromMinutes = fromHour * 60 + fromMinute;
  const toMinutes = toHour * 60 + toMinute;
  return currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
}

function BookingSection() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";
  const messageRef = useRef(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [code, setCode] = useState("");
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!selectedDate) return;
    const fetchBlockedTimes = async () => {
      const dateObj = new Date(selectedDate);
      const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      const dayHours = workingHours[weekday];
      if (!dayHours) {
        setAvailableTimes([]);
        return;
      }
      const all = generateTimeSlots(dayHours.from, dayHours.to);
      try {
        const docRef = doc(db, "blockedTimes", selectedDate);
        const docSnap = await getDoc(docRef);
        const blocked = docSnap.exists() ? docSnap.data().times || [] : [];
        const q = query(collection(db, "bookings"), where("selectedDate", "==", selectedDate));
        const snapshot = await getDocs(q);
        const booked = snapshot.docs.map((doc) => doc.data().selectedTime);
        const unavailable = [...new Set([...blocked, ...booked])];
        const filtered = all.filter((time) => !unavailable.includes(time));
        setAvailableTimes(filtered);
      } catch (error) {
        console.error("🔥 Error getting times from Firestore:", error);
        setAvailableTimes([]);
      }
    };
    fetchBlockedTimes();
  }, [selectedDate]);

  useEffect(() => {
    if (!phoneNumber) {
      setBookings([]);
      return;
    }
    const fetchBookingsByPhone = async () => {
      try {
        const q = query(collection(db, "bookings"), where("phoneNumber", "==", phoneNumber));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => doc.data());
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };
    fetchBookingsByPhone();
  }, [phoneNumber]);

  useEffect(() => {
    if (submitted && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !phoneNumber || !selectedDate || !selectedTime || !selectedService) {
      alert(t("fill_required_fields"));
      return;
    }
    const existingBookingsQuery = query(collection(db, "bookings"), where("phoneNumber", "==", phoneNumber));
    const existingSnapshot = await getDocs(existingBookingsQuery);
    if (!existingSnapshot.empty) {
      const confirmNew = window.confirm("⚠️ يوجد لديك حجوزات سابقة برقم الهاتف هذا. هل تريد إضافة حجز جديد؟");
      if (!confirmNew) return;
    }
    try {
      const q = query(
        collection(db, "bookings"),
        where("selectedDate", "==", selectedDate),
        where("selectedTime", "==", selectedTime)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert(t("time_already_booked") || "هذه الساعة محجوزة بالفعل، يرجى اختيار ساعة أخرى.");
        return;
      }
      const bookingCode = Math.random().toString(36).substring(2, 8);
      setCode(bookingCode);
      await addDoc(collection(db, "bookings"), {
        fullName,
        phoneNumber,
        selectedDate,
        selectedTime,
        selectedService,
        bookingCode,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setFullName("");
      setPhoneNumber("");
      setSelectedDate("");
      setSelectedTime("");
      setSelectedService("");
    } catch (error) {
      console.error("Error saving booking:", error);
      alert("حدث خطأ أثناء حفظ الحجز، يرجى المحاولة لاحقًا.");
    }
  };

  return (
    <section id="booking" className={`bg-[#f8f8f8] text-primary py-16 px-4 ${fontClass}`}>
      <div className="max-w-xl mx-auto">
        <h2 className="text-4xl font-bold mb-8 text-center text-gold">{t("book_now")}</h2>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md mb-6">
          <h3 className="text-lg font-bold text-gold mb-2 flex items-center gap-2">
            <span>🕒</span> {t("working_hours")}
          </h3>
          <p className={`mb-3 text-sm font-semibold ${isOpenNow() ? "text-green-600" : "text-red-600"}`}>
            {isOpenNow() ? t("open_now") : t("closed_today")}
          </p>
          <div className="divide-y divide-gray-100 border-t border-gray-100 pt-3">
            {Object.entries(workingHours).map(([day, hours]) => (
              <div key={day} className="flex justify-between py-2 text-sm font-medium text-gray-700">
                <span className="capitalize">{t(day.toLowerCase())}</span>
                {hours ? (
                  <span className="text-gray-900">{hours.from} – {hours.to}</span>
                ) : (
                  <span className="text-red-600">{t("closed")}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100">
          {submitted && (
            <div ref={messageRef} className="fade-in bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-center text-lg">
              ✅ {t("thank_you")}<br />🔐 {t("your_code")}: <strong>{code}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="text" placeholder={t("name")} className="w-full p-3 border border-gray-300 rounded-xl" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input type="tel" placeholder={t("phone")} className="w-full p-3 border border-gray-300 rounded-xl" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={selectedDate}
              onChange={(e) => {
                const dateStr = e.target.value;
                const dayName = new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
                const closedDays = ["Sunday"];
                if (closedDays.includes(dayName)) {
                  alert("⚠️ هذا اليوم مغلق ولا يمكن الحجز فيه.");
                  setSelectedDate("");
                  setSelectedTime("");
                } else {
                  setSelectedDate(dateStr);
                  setSelectedTime("");
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-xl"
              required
            />

            {selectedDate && availableTimes.length > 0 && (
              <div>
                <label className="block mb-2 font-semibold text-gray-700">{t("choose_time")}</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableTimes.map((time) => (
                    <button
                      type="button"
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-3 rounded-md text-sm font-medium border transition 
                        ${selectedTime === time
                          ? "bg-gold text-primary border-gold shadow"
                          : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gold hover:text-primary"}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && availableTimes.length === 0 && (
              <p className="text-red-500 text-sm font-medium">{t("no_hours")}</p>
            )}

            <div>
              <label className="block mb-2 font-semibold text-gray-700">{t("choose_service")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "haircut", label: t("service_haircut") },
                  { id: "beard", label: t("service_beard") },
                ].map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedService(service.id)}
                    className={`py-2 px-3 rounded-md font-medium border transition 
                      ${selectedService === service.id
                        ? "bg-gold text-primary border-gold shadow"
                        : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gold hover:text-primary"}`}
                  >
                    {service.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-gold text-primary py-3 rounded-xl font-bold hover:bg-darkText hover:text-light transition"
            >
              {t("confirm_booking")}
            </button>
          </form>

          {phoneNumber && bookings.length > 0 && (
            <div className="mt-6 bg-white p-4 border rounded shadow text-sm">
              <h4 className="font-bold mb-2 text-gold">حجوزاتك الحالية:</h4>
              <ul className="space-y-1">
                {bookings.map((b, idx) => (
                  <li key={idx} className="flex justify-between border-b pb-1">
                    <span>{b.selectedDate} - {b.selectedTime}</span>
                    <span className="text-gray-600">{b.selectedService}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      
    </section>
  );
}

export default BookingSection;
