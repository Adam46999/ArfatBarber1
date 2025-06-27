// src/components/booking/BookingSection.jsx
 import { getMessaging, getToken } from "firebase/messaging";
import { app } from "../../firebase"; // تأكد من أن المسار صحيح حسب مشروعك
import DateSelector from "./DateSelector";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase"; // تأكد من المسار الصحيح
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


function getOpeningStatus() {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const todayHours = workingHours[dayName];
  if (!todayHours) return "close";

  const [fromHour, fromMinute] = todayHours.from.split(":").map(Number);
  const [toHour, toMinute] = todayHours.to.split(":").map(Number);

  const from = new Date();
  from.setHours(fromHour, fromMinute, 0, 0);
  const to = new Date();
  to.setHours(toHour, toMinute, 0, 0);

  const minutesUntilOpen = (from - now) / (1000 * 60);
  const minutesUntilClose = (to - now) / (1000 * 60);

  if (now < from && minutesUntilOpen <= 60 && minutesUntilOpen > 0) {
    return "opening_soon";
  }

  if (now >= from && now <= to && minutesUntilClose <= 60 && minutesUntilClose > 0) {
    return "closing_soon";
  }

  if (now >= from && now <= to) {
    return "open";
  }

  return "close";
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
  // ✅ progress bar
const [step, setStep] = useState(1);
const [progress, setProgress] = useState(0);


  // ---------- دالة Input Mask للـ “رقم الهاتف” يبدأ بـ 05 وطوله 10 أرقام ----------
  const handlePhoneChange = (e) => {
    let digitsOnly = e.target.value.replace(/\D/g, ""); // إزالة أي حرف غير رقم

    // إذا تجاوز طول الأرقام 10 أرقام، اقتصره على 10
    if (digitsOnly.length > 10) {
      digitsOnly = digitsOnly.slice(0, 10);
    }

    // تأكد أن الرقم يبدأ بـ "05"
    if (digitsOnly.length >= 1 && digitsOnly[0] !== "0") {
      digitsOnly = ""; // إذا أول رقم ليس 0، نعيد القيمة فارغة
    }
    if (digitsOnly.length >= 2 && digitsOnly.slice(0, 2) !== "05") {
      digitsOnly = digitsOnly.slice(0, 1); // إذا أول رقمين ليسا "05"، نحتفظ فقط بـ "0"
    }

    // بعد التأكد من صحة البداية: نسق الرقم مع شرطة "-" بعد الرقم الثالث
    if (digitsOnly.length > 3) {
      const part1 = digitsOnly.slice(0, 3); // "05X"
      const part2 = digitsOnly.slice(3);    // باقي الأرقام
      setPhoneNumber(`${part1}-${part2}`);
    } else {
      setPhoneNumber(digitsOnly);
    }
  };
  // ------------------------------------------------------------
useEffect(() => {
  if (!selectedDate) return;

  // 1. نحول السلسلة لتاريخ ونستخرج اسم اليوم بالإنجليزية
  const dateObj = new Date(selectedDate);
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });

  // 2. إذا اليوم هو الأحد → نعتبره مغلق ونفرّغ القائمة
  if (weekday === "Sunday") {
    setAvailableTimes([]);
    return;
  }

  // 3. نحصل على ساعات العمل لذلك اليوم
  const dayHours = workingHours[weekday];
  if (!dayHours) {
    console.warn("⚠️ لا توجد ساعات معرفة لهذا اليوم:", weekday);
    setAvailableTimes([]);
    return;
  }

  // 4. نولّد كل الفترات بنصف ساعة
  const allSlots = generateTimeSlots(dayHours.from, dayHours.to);

  // 5. نجيب الأوقات المحظورة والمحجوزة ثم ننقيها
  (async () => {
    try {
      const docSnap = await getDoc(doc(db, "blockedTimes", selectedDate));
      const blocked = docSnap.exists() ? docSnap.data().times || [] : [];

      const q = query(
        collection(db, "bookings"),
        where("selectedDate", "==", selectedDate),
        where("cancelledAt", "==", null)
      );
      const bookedSnap = await getDocs(q);
      const booked = bookedSnap.docs.map(d => d.data().selectedTime);

      const unavailable = Array.from(new Set([...blocked, ...booked]));
      const available = allSlots.filter(t => !unavailable.includes(t));

      setAvailableTimes(available);
    } catch (err) {
      console.error("🔥 خطأ بجلب الفترات:", err);
      setAvailableTimes([]);
    }
  })();

}, [selectedDate]);


  useEffect(() => {
    if (!phoneNumber) {
      setBookings([]);
      return;
    }
    // عند البحث، نشيل الشرطات "–" لأننا نخزن الأرقام رقميًا في Firestore
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    const fetchBookingsByPhone = async () => {
      try {
        const q = query(
          collection(db, "bookings"),
          where("phoneNumber", "==", cleanPhone)
        );
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
  useEffect(() => {
  let currentStep = 0;
  if (fullName) currentStep++;
  if (phoneNumber) currentStep++;
  if (selectedDate) currentStep++;
  if (selectedTime) currentStep++;
  if (selectedService) currentStep++;
  setStep(currentStep);
  setProgress((currentStep / 5) * 100); // شريط التقدم كنسبة مئوية
}, [fullName, phoneNumber, selectedDate, selectedTime, selectedService]);



  const handleSubmit = async (e) => {
   
    e.preventDefault();

    if (
      !fullName ||
      !phoneNumber ||
      !selectedDate ||
      !selectedTime ||
      !selectedService
    ) {
      alert(t("fill_required_fields"));
      return;
    }
let fcmToken = "";
try {
  const messaging = getMessaging(app);
  fcmToken = await getToken(messaging, {
    vapidKey: "BMSKYpj6OfL2RinVjw4jUNlL-Hbi1Ev4eiTibIKlvFwqSULUm42ricVJRcKbptmiepuDbl3andf-F2tf7Cmr-U8",
  });
} catch (err) {
  console.warn("FCM token error", err);
}

    // إزالة أي حرف غير رقم قبل الإرسال
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    // التحقق من الحجوزات السابقة لرقم الهاتف نفسه
    const existingBookingsQuery = query(
      collection(db, "bookings"),
      where("phoneNumber", "==", cleanPhone)
    );
    const existingSnapshot = await getDocs(existingBookingsQuery);
    if (!existingSnapshot.empty) {
      const confirmNew = window.confirm(
        "⚠️ يوجد لديك حجوزات سابقة برقم الهاتف هذا. هل تريد إضافة حجز جديد؟"
      );
      if (!confirmNew) return;
    }
    const bookingCode = Math.random().toString(36).substring(2, 8);
setCode(bookingCode); // هذا السطر اختياري لعرض الكود للمستخدم بعد الحجز


    // التأكد أن الوقت المختار غير محجوز مسبقًا
    try {
      const q = query(
        collection(db, "bookings"),
        where("selectedDate", "==", selectedDate),
        where("selectedTime", "==", selectedTime)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert(
          t("time_already_booked") ||
            "هذه الساعة محجوزة بالفعل، يرجى اختيار ساعة أخرى."
        );
        return;
      }

      // إنشاؤه كود عشوائي للحجز
      const bookingDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
const timestamp = bookingDateTime.getTime();

await addDoc(collection(db, "bookings"), {
  fullName,
  phoneNumber: cleanPhone,
  selectedDate,
  selectedTime,
  selectedService,
  bookingCode,
  timestamp,
  reminderSent_60: false,
  reminderSent_30: false,
  fcmToken, // ✅ أضف هذا السطر
  createdAt: serverTimestamp(),
});


      // إعادة تهيئة الحقول بعد الحفظ
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
        <h2 className="text-4xl font-bold mb-8 text-center text-gold">
          {t("book_now")}
        </h2>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md mb-6">
          <h3 className="text-lg font-bold text-gold mb-2 flex items-center gap-2">
            <span>🕒</span> {t("working_hours")}
          </h3>
          {(() => {
  const status = getOpeningStatus();
  let textColor = "text-red-600";
  let message = t("closed_today");

  if (status === "open") {
    textColor = "text-green-600";
    message = t("open_now");
  } else if (status === "opening_soon") {
    textColor = "text-yellow-600";
    message = "سنفتح قريبًا";
  } else if (status === "closing_soon") {
    textColor = "text-yellow-600";
    message = "سنغلق قريبًا";
  }

  return (
    <p className={`mb-3 text-sm font-semibold ${textColor}`}>
      {message}
    </p>
  );
})()}
          <div className="divide-y divide-gray-100 border-t border-gray-100 pt-3">
            {Object.entries(workingHours).map(([day, hours]) => (
              <div
                key={day}
                className="flex justify-between py-2 text-sm font-medium text-gray-700"
              >
                <span className="capitalize">{t(day.toLowerCase())}</span>
                {hours ? (
                  <span className="text-gray-900">
                    {hours.from} – {hours.to}
                  </span>
                ) : (
                  <span className="text-red-600">{t("closed")}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100">
          {submitted && (
            <div
              ref={messageRef}
              className="fade-in bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-center text-lg"
            >
              ✅ {t("thank_you")}
              <br />🔐 {t("your_code")}: <strong>{code}</strong>
            </div>
          )}
{/* ✅ شريط التقدم قبل الـ form مباشرةً */}
<div className="flex justify-between items-center mb-6">
  <div className="flex-1 h-1 bg-gray-300 rounded-full">
    <div
      className="h-1 bg-gold rounded-full transition-all duration-300"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
  <div className="ml-4 text-sm font-semibold text-gray-600">
    {t("step") || "Step"} {step} / 5
  </div>
</div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ---------- حقل الاسم ---------- */}
            <input
              type="text"
              placeholder={t("name")}
              className="w-full p-3 border border-gray-300 rounded-xl"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            {/* ---------- حقل رقم الهاتف مع Input Mask ---------- */}
            <input
              type="tel"
              placeholder={t("phone")}
              className="w-full p-3 border border-gray-300 rounded-xl"
              value={phoneNumber}
              onChange={handlePhoneChange}
              required
            />
            {/* مثال التنسيق النهائي: "05X-XXXXXXX" (10 أرقام) */}

            {/* ---------- حقل اختيار التاريخ ---------- */}
           {/* ---------- حقل اختيار التاريخ (DateSelector) ---------- */}
<label className="block mb-2 font-semibold text-gray-700">
  {t("choose_date")}
</label>
<DateSelector
  selectedDate={selectedDate ? new Date(selectedDate) : null}
  onChange={(date) => {
    // date هو كائن JS Date، ومنعه يوم الأحد تم في الـ DateSelector نفسه
    setSelectedDate(date.toISOString().slice(0,10));
    setSelectedTime("");
  }}
  placeholder={t("select_date") || "اختر التاريخ"}
/>


            {/* ---------- اختيارات الأوقات حسب التاريخ ---------- */}
            {selectedDate && availableTimes.length > 0 && (
              <div>
                <label className="block mb-2 font-semibold text-gray-700">
                  {t("choose_time")}
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableTimes.map((time) => (
                    <button
                      type="button"
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-3 rounded-md text-sm font-medium border transition 
                        ${
                          selectedTime === time
                            ? "bg-gold text-primary border-gold shadow"
                            : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gold hover:text-primary"
                        }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && availableTimes.length === 0 && (
              <p className="text-red-500 text-sm font-medium">
                {t("no_hours")}
              </p>
            )}

            {/* ---------- اختيار الخدمة ---------- */}
            <div>
              <label className="block mb-2 font-semibold text-gray-700">
                {t("choose_service")}
              </label>
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
                      ${
                        selectedService === service.id
                          ? "bg-gold text-primary border-gold shadow"
                          : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gold hover:text-primary"
                      }`}
                  >
                    {service.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ---------- زر تأكيد الحجز ---------- */}
            <button
              type="submit"
              className="w-full mt-4 bg-gold text-primary py-3 rounded-xl font-bold hover:bg-darkText hover:text-light transition"
            >
              {t("confirm_booking")}
            </button>
          </form>

          {/* ---------- عرض الحجوزات الحالية (إن وُجدت) ---------- */}
          {phoneNumber && bookings.length > 0 && (
            <div className="mt-6 bg-white p-4 border rounded shadow text-sm">
              <h4 className="font-bold mb-2 text-gold">حجوزاتك الحالية:</h4>
              <ul className="space-y-1">
                {bookings.map((b, idx) => (
                  <li key={idx} className="flex justify-between border-b pb-1">
                    <span>
                      {b.selectedDate} - {b.selectedTime}
                    </span>
                    <span className="text-gray-600">{b.selectedService}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ملاحظة: أزلنا زر “العودة للأعلى” القديم من هنا */}
    </section>
  );
}

export default BookingSection
