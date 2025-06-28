import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayCount, setTodayCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
const qToday = query(
  collection(db, "bookings"),
  where("selectedDate", ">=", todayStr),
  where("selectedDate", "<=", todayStr)
);
const snapToday = await getDocs(qToday);
const activeToday = snapToday.docs.filter(d => !d.data().cancelledAt);
setTodayCount(activeToday.length);


      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToSunday = dayOfWeek;
      const start = new Date(now);
      start.setDate(now.getDate() - diffToSunday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      const qWeek = query(
        collection(db, "bookings"),
        where("selectedDate", ">=", startStr),
        where("selectedDate", "<=", endStr)
      );
      const snapWeek = await getDocs(qWeek);
      const activeWeek = snapWeek.docs.filter(d => !d.data().cancelledAt);
setWeekCount(activeWeek.length);


      const blockedSnap = await getDocs(collection(db, "blockedDays"));
      setBlockedCount(blockedSnap.docs.length);
    };

    fetchStats();
  }, []);

  const exportAsExcel = async () => {
  const snap = await getDocs(collection(db, "bookings"));

  const rows = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      "👤 الاسم": data.fullName || "",
      "📞 رقم الهاتف": data.phoneNumber || "",
      "🗓️ التاريخ": data.selectedDate || "",
      "🕒 الساعة": data.selectedTime || "",
      "💈 الخدمة": 
        data.selectedService === "haircut" ? "قص شعر" :
        data.selectedService === "beard" ? "تعليم لحية" :
        data.selectedService === "combo" ? "قص شعر + لحية" :
        data.selectedService || "",
      "📌 كود الحجز": data.bookingCode || "",
      "📅 تم الإنشاء": data.createdAt
        ? new Date(data.createdAt).toLocaleString("ar-EG")
        : "",
      "❌ ملغي؟": data.cancelledAt ? "نعم" : "لا",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "حجوزات");
  XLSX.writeFile(workbook, "تقرير-الحجوزات.xlsx");
};

  

  return (
    <section className="min-h-screen p-6 pt-24 bg-gray-100 font-ar" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow">
        {/* زر الرجوع */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          ← الرجوع للصفحة السابقة
        </button>

        <h1 className="text-2xl font-bold mb-6 text-gold">لوحة التقارير</h1>

        <div className="grid grid-cols-2 gap-6 text-center">
          <div className="bg-green-100 p-4 rounded-xl">
            <h2 className="text-xl font-semibold">حجوزات اليوم</h2>
            <p className="text-3xl text-green-700 font-bold">{todayCount}</p>
            <p className="text-sm mt-2 text-gray-600">
              عدد الزبائن اللي حجزوا عندك بتاريخ اليوم.
            </p>
          </div>

          <div className="bg-blue-100 p-4 rounded-xl">
            <h2 className="text-xl font-semibold">حجوزات الأسبوع</h2>
            <p className="text-3xl text-blue-700 font-bold">{weekCount}</p>
            <p className="text-sm mt-2 text-gray-600">
              مجموع الحجوزات من الأحد للسبت الحالي.
            </p>
          </div>

          <div className="bg-yellow-100 p-4 rounded-xl">
            <h2 className="text-xl font-semibold">أيام مغلقة</h2>
            <p className="text-3xl text-yellow-700 font-bold">{blockedCount}</p>
            <p className="text-sm mt-2 text-gray-600">
              عدد الأيام اللي عملت فيها "تعطيل يوم كامل".
            </p>
          </div>

          <div className="bg-gray-200 p-4 rounded-xl">
            <h2 className="text-xl font-semibold">تصدير</h2>
            <button
              onClick={exportAsExcel}
              className="mt-2 bg-gold text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              تصدير كـ Excel
            </button>
            <p className="text-sm mt-2 text-gray-600">
              تصدير كل الحجوزات كملف Excel للنسخ أو الطباعة.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
