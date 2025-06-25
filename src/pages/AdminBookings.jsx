// src/pages/AdminBookings.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  deleteField
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaClock,
  FaCut
} from "react-icons/fa";

// تنسيق التاريخ: YYYY-MM-DD → DD/MM/YYYY
function formatDateArabic(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

// تنسيق التاريخ والوقت من ISO string أو Timestamp
function formatDateTime(value) {
  const d = typeof value === "string" ? new Date(value) : value.toDate();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,"0");
  const min = String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// الوسم (اليوم)/(بكرا)
function getDateLabel(dateStr) {
  const today = new Date().toISOString().slice(0,10);
  const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
  if (dateStr === today) return " (اليوم)";
  if (dateStr === tomorrow) return " (بكرا)";
  return "";
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [recentPast, setRecentPast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndClassify() {
      setLoading(true);
      const now = new Date();
      const snap = await getDocs(query(collection(db, "bookings")));

      const up = [];
      const past = [];

      for (const d of snap.docs) {
        const data = d.data();
        const when = new Date(`${data.selectedDate}T${data.selectedTime}:00`);
        const diffH = (now - when)/(1000*60*60);

        // حذف تلقائي لمن مر عليه أكثر من ساعتين
        if (diffH > 2) {
          await deleteDoc(doc(db, "bookings", d.id));
          continue;
        }

        // تصنيف
        if (data.cancelledAt || diffH >= 0) {
          past.push({ id: d.id, ...data });
        } else {
          up.push({ id: d.id, ...data });
        }
      }

      // ترتيب القادمة
      up.sort((a,b)=>{
        const da = new Date(`${a.selectedDate}T${a.selectedTime}:00`);
        const dbk = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
        return da - dbk;
      });

      setUpcoming(up);
      setRecentPast(past);
      setLoading(false);
    }
    fetchAndClassify();
  }, []);

  // إلغاء من القادمة → المنتهية حديثاً
  const handleCancel = async (b) => {
    const cancelledAt = new Date().toISOString();
    await updateDoc(doc(db, "bookings", b.id), { cancelledAt });

    setUpcoming(u => u.filter(x => x.id !== b.id));
    setRecentPast(p => [{ ...b, cancelledAt }, ...p]);
  };

  // استرجاع الحجز الملغى مع تجاهل الحجوزات الملغاة في فحص التعارض
  const handleRestore = async (b) => {
    // تحقق محلي أولاً
    if (upcoming.some(x =>
      x.selectedDate === b.selectedDate &&
      x.selectedTime === b.selectedTime
    )) {
      alert("لا يمكن استرجاع هذا الحجز؛ الموعد محجوز حالياً.");
      return;
    }

    // تحقق في Firestore من الحجوزات الفعلية فقط (غير الملغاة)
    const conflictQ = query(
      collection(db, "bookings"),
      where("selectedDate", "==", b.selectedDate),
      where("selectedTime", "==", b.selectedTime)
    );
    const conflictSnap = await getDocs(conflictQ);
    // استبعد أي وثيقة لديها cancelledAt
    const activeConflicts = conflictSnap.docs
      .map(d => d.data())
      .filter(data => !data.cancelledAt);

    if (activeConflicts.length > 0) {
      alert("لا يمكن استرجاع هذا الحجز؛ تم حجز هذا الموعد من قبل.");
      return;
    }

    // إعادة الحجز للقائمة القادمة
    setRecentPast(p => p.filter(x => x.id !== b.id));
    setUpcoming(u =>
      [...u, b].sort((a,c)=>{
        const da = new Date(`${a.selectedDate}T${a.selectedTime}:00`);
        const dc = new Date(`${c.selectedDate}T${c.selectedTime}:00`);
        return da - dc;
      })
    );

    // إزالة علامة الإلغاء من قاعدة البيانات
    await updateDoc(doc(db, "bookings", b.id), { cancelledAt: deleteField() });
  };

  // حذف نهائي من recentPast
  const handleDelete = async (b) => {
    await deleteDoc(doc(db, "bookings", b.id));
    setRecentPast(p => p.filter(x => x.id !== b.id));
  };

  // تجميع القادمة
  const grouped = upcoming.reduce((acc,b)=>{
    (acc[b.selectedDate] = acc[b.selectedDate]||[]).push(b);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();

  return (
    <section className="min-h-screen bg-gray-100 pt-16 p-4 font-body" dir="rtl">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        {/* رأس */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm">
            ← العودة
          </button>
          <h1 className="text-2xl font-bold">لوحة الحجوزات</h1>
        </div>

        {loading ? (
          <p className="text-center py-10 text-gray-500">جاري التحميل...</p>
        ) : (
          <>
            {/* القادمة */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-green-700 mb-4">الحجوزات القادمة</h2>
              {dates.length === 0 ? (
                <p className="text-gray-500">لا توجد حجوزات قادمة.</p>
              ) : dates.map(date => (
                <div key={date} className="mb-6">
                  <h3 className="text-lg font-medium mb-2">
                    {formatDateArabic(date)}{getDateLabel(date)}
                  </h3>
                  <div className="space-y-4">
                    {grouped[date].map(b => (
                      <div key={b.id} className="flex justify-between items-center border p-4 rounded-lg">
                        <div className="space-y-1 text-sm">
                          <p><FaUser className="inline text-gold"/> {b.fullName}</p>
                          <p><FaPhone className="inline text-gray-500"/> <a href={`tel:${b.phoneNumber}`} className="text-blue-600 hover:underline">{b.phoneNumber}</a></p>
                          <p><FaClock className="inline text-gray-500"/> {b.selectedTime}</p>
                          <p><FaCut className="inline text-gray-500"/> {b.selectedService==="haircut"?"قص شعر":b.selectedService==="beard"?"تعليم لحية":"قص شعر + لحية"}</p>
                          <p className="text-xs text-gray-600">تم الحجز: {formatDateTime(b.createdAt)}</p>
                        </div>
                        <button onClick={() => handleCancel(b)} className="text-red-600 hover:underline">إلغاء</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* المنتهية حديثًا */}
            <div>
              <h2 className="text-xl font-semibold text-yellow-600 mb-4">الحجوزات المنتهية حديثًا</h2>
              {recentPast.length === 0 ? (
                <p className="text-gray-500">لا توجد حجوزات منتهية حديثًا.</p>
              ) : (
                <div className="space-y-4">
                  {recentPast.map(b => (
                    <div key={b.id} className="flex justify-between items-center border p-4 rounded-lg bg-gray-50">
                      <div className="space-y-1 text-sm">
                        <p><FaUser className="inline text-gold"/> {b.fullName}</p>
                        <p><FaPhone className="inline text-gray-500"/> <a href={`tel:${b.phoneNumber}`} className="text-blue-600 hover:underline">{b.phoneNumber}</a></p>
                        <p><FaCalendarAlt className="inline text-gray-500"/> {formatDateArabic(b.selectedDate)}</p>
                        <p><FaClock className="inline text-gray-500"/> {b.selectedTime}</p>
                        {b.cancelledAt && <p className="text-xs text-red-500">تم الإلغاء: {formatDateTime(b.cancelledAt)}</p>}
                      </div>
                      <div className="flex gap-4">
                        {b.cancelledAt && (
                          <button onClick={() => handleRestore(b)} className="text-green-600 hover:underline">استرجاع</button>
                        )}
                        <button onClick={() => handleDelete(b)} className="text-gray-600 hover:underline">حذف نهائي</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
