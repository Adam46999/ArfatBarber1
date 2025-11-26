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
  deleteField,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaUser, FaPhone, FaCalendarAlt, FaClock, FaCut } from "react-icons/fa";
import { e164ToLocalPretty } from "../utils/phone";

function formatDateArabic(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatDateTime(value) {
  const d = typeof value === "string" ? new Date(value) : value.toDate();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function getDateLabel(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
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
      const now = new Date();
      const snap = await getDocs(query(collection(db, "bookings")));

      const up = [];
      const past = [];

      for (const d of snap.docs) {
        const data = d.data();
        const when = new Date(`${data.selectedDate}T${data.selectedTime}:00`);
        const diffH = (now - when) / (1000 * 60 * 60);

        if (diffH > 2) {
          await deleteDoc(doc(db, "bookings", d.id));
          continue;
        }

        if (data.cancelledAt || diffH >= 0) {
          past.push({ id: d.id, ...data });
        } else {
          up.push({ id: d.id, ...data });
        }
      }

      up.sort((a, b) => {
        const da = new Date(`${a.selectedDate}T${a.selectedTime}:00`);
        const dbb = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
        return da - dbb;
      });

      setUpcoming(up);
      setRecentPast(past);
      setLoading(false);
    }

    fetchAndClassify();
    const interval = setInterval(() => fetchAndClassify(), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (b) => {
    const cancelledAt = new Date().toISOString();
    await updateDoc(doc(db, "bookings", b.id), { cancelledAt });
    setUpcoming((u) => u.filter((x) => x.id !== b.id));
    setRecentPast((p) => [{ ...b, cancelledAt }, ...p]);
  };

  const handleRestore = async (b) => {
    if (
      upcoming.some(
        (x) =>
          x.selectedDate === b.selectedDate && x.selectedTime === b.selectedTime
      )
    ) {
      alert("لا يمكن استرجاع هذا الحجز؛ الموعد محجوز حالياً.");
      return;
    }

    const conflictQ = query(
      collection(db, "bookings"),
      where("selectedDate", "==", b.selectedDate),
      where("selectedTime", "==", b.selectedTime)
    );
    const conflictSnap = await getDocs(conflictQ);
    const activeConflicts = conflictSnap.docs
      .map((d) => d.data())
      .filter((data) => !data.cancelledAt);

    if (activeConflicts.length > 0) {
      alert("لا يمكن استرجاع هذا الحجز؛ تم حجز هذا الموعد من قبل.");
      return;
    }

    setRecentPast((p) => p.filter((x) => x.id !== b.id));
    setUpcoming((u) =>
      [...u, b].sort((a, c) => {
        const da = new Date(`${a.selectedDate}T${a.selectedTime}:00`);
        const dc = new Date(`${c.selectedDate}T${c.selectedTime}:00`);
        return da - dc;
      })
    );
    await updateDoc(doc(db, "bookings", b.id), { cancelledAt: deleteField() });
    window.location.reload();
  };

  const handleDelete = async (b) => {
    await deleteDoc(doc(db, "bookings", b.id));
    setRecentPast((p) => p.filter((x) => x.id !== b.id));
  };

  return (
    <section className="min-h-screen bg-gray-100 pt-24 p-4 font-body" dir="rtl">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-6 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline text-sm"
          >
            ← الرجوع
          </button>
          <h1 className="text-2xl font-bold text-gold">لوحة الحجوزات</h1>
        </div>

        {loading ? (
          <p className="text-center py-10 text-gray-500">جاري التحميل...</p>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 rounded-xl shadow p-4 border border-green-200">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                📆 الحجوزات القادمة
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-gray-600">لا توجد حجوزات قادمة حالياً.</p>
              ) : (
                Object.entries(
                  upcoming.reduce((acc, b) => {
                    (acc[b.selectedDate] = acc[b.selectedDate] || []).push(b);
                    return acc;
                  }, {})
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, bookings]) => (
                    <div key={date} className="mb-6">
                      <h3 className="text-lg font-medium text-green-900 mb-2 border-b pb-1 border-green-300">
                        📅 {formatDateArabic(date)}
                        {getDateLabel(date)}
                      </h3>
                      <div className="space-y-3">
                        {bookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex justify-between items-center bg-white border border-gray-200 rounded-xl px-4 py-3"
                          >
                            <div className="text-sm space-y-1">
                              <p>
                                <FaUser className="inline text-gold mr-1" />{" "}
                                {b.fullName}
                              </p>
                              <p>
                                <FaPhone className="inline text-gray-500 mr-1" />{" "}
                                <a
                                  href={`tel:${b.phoneNumber}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {e164ToLocalPretty(b.phoneNumber)}
                                </a>
                              </p>
                              <p>
                                <FaClock className="inline text-gray-500 mr-1" />{" "}
                                {b.selectedTime}
                              </p>
                              <p>
                                <FaCut className="inline text-gray-500 mr-1" />{" "}
                                {b.selectedService === "haircut"
                                  ? "قص شعر"
                                  : b.selectedService === "beard"
                                  ? "تعليم لحية"
                                  : "قص شعر + لحية"}
                              </p>
                              <p className="text-xs text-gray-600">
                                تم الحجز: {formatDateTime(b.createdAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCancel(b)}
                              className="text-red-600 hover:underline text-sm"
                            >
                              إلغاء
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="bg-yellow-50 rounded-xl shadow p-4 border border-yellow-300">
              <h2 className="text-xl font-semibold text-yellow-800 mb-4">
                🕘 الحجوزات المنتهية حديثًا
              </h2>
              {recentPast.length === 0 ? (
                <p className="text-gray-600">لا توجد حجوزات منتهية حالياً.</p>
              ) : (
                <div className="space-y-3">
                  {recentPast.map((b) => (
                    <div
                      key={b.id}
                      className="flex justify-between items-center bg-white border border-gray-200 rounded-xl px-4 py-3"
                    >
                      <div className="text-sm space-y-1">
                        <p>
                          <FaUser className="inline text-gold mr-1" />{" "}
                          {b.fullName}
                        </p>
                        <p>
                          <FaPhone className="inline text-gray-500 mr-1" />{" "}
                          <a
                            href={`tel:${b.phoneNumber}`}
                            className="text-blue-600 hover:underline"
                          >
                            {e164ToLocalPretty(b.phoneNumber)}
                          </a>
                        </p>
                        <p>
                          <FaCalendarAlt className="inline text-gray-500 mr-1" />{" "}
                          {formatDateArabic(b.selectedDate)}
                        </p>
                        <p>
                          <FaClock className="inline text-gray-500 mr-1" />{" "}
                          {b.selectedTime}
                        </p>
                        {b.cancelledAt && (
                          <p className="text-xs text-red-500">
                            🚫 تم الإلغاء: {formatDateTime(b.cancelledAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-center">
                        {b.cancelledAt && (
                          <button
                            onClick={() => handleRestore(b)}
                            className="text-green-700 hover:underline"
                          >
                            استرجاع
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(b)}
                          className="text-gray-600 hover:underline"
                        >
                          حذف نهائي
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
