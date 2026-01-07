import { useEffect, useMemo, useState } from "react";
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
import {
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaClock,
  FaCut,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaTrash,
  FaUndo,
  FaTimesCircle,
} from "react-icons/fa";
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
  if (dateStr === today) return "اليوم";
  if (dateStr === tomorrow) return "بكرا";
  return "";
}

function serviceLabel(key) {
  return key === "haircut"
    ? "قص شعر"
    : key === "beard"
    ? "تعليم لحية"
    : "قص + لحية";
}

function serviceBadgeClasses(key) {
  // ألوان هادية مريحة للحلاق (بدون صراخ)
  if (key === "haircut") return "bg-blue-50 text-blue-700 border-blue-100";
  if (key === "beard") return "bg-purple-50 text-purple-700 border-purple-100";
  return "bg-amber-50 text-amber-800 border-amber-100";
}

function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [recentPast, setRecentPast] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI states (فقط عرض)
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all"); // all | haircut | beard | both
  const [sortMode, setSortMode] = useState("soonest"); // soonest | newest
  const [lastUpdated, setLastUpdated] = useState(null);

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
      setLastUpdated(new Date());
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
    const ok = window.confirm("متأكد بدك حذف نهائي؟ (ما بنقدر نرجّعه)");
    if (!ok) return;
    await deleteDoc(doc(db, "bookings", b.id));
    setRecentPast((p) => p.filter((x) => x.id !== b.id));
  };

  // فلترة/ترتيب للعرض فقط (بدون تغيير منطق)
  const filteredUpcoming = useMemo(() => {
    const term = safeLower(searchTerm).trim();
    let list = [...upcoming];

    if (serviceFilter !== "all") {
      list = list.filter((b) => b.selectedService === serviceFilter);
    }

    if (term) {
      list = list.filter((b) => {
        const name = safeLower(b.fullName);
        const phonePretty = safeLower(e164ToLocalPretty(b.phoneNumber));
        const phoneRaw = safeLower(b.phoneNumber);
        return (
          name.includes(term) ||
          phonePretty.includes(term) ||
          phoneRaw.includes(term)
        );
      });
    }

    if (sortMode === "newest") {
      list.sort((a, b) => {
        const da =
          typeof a.createdAt === "string"
            ? new Date(a.createdAt)
            : a.createdAt?.toDate?.() ?? new Date(0);
        const dbb =
          typeof b.createdAt === "string"
            ? new Date(b.createdAt)
            : b.createdAt?.toDate?.() ?? new Date(0);
        return dbb - da;
      });
    } else {
      list.sort((a, b) => {
        const da = new Date(`${a.selectedDate}T${a.selectedTime}:00`);
        const dbb = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
        return da - dbb;
      });
    }

    return list;
  }, [upcoming, searchTerm, serviceFilter, sortMode]);

  const filteredPast = useMemo(() => {
    const term = safeLower(searchTerm).trim();
    let list = [...recentPast];

    if (serviceFilter !== "all") {
      // past قد يحتوي حجوزات ما فيها selectedService (حسب داتا القديمة)
      list = list.filter(
        (b) => (b.selectedService ?? "both") === serviceFilter
      );
    }

    if (term) {
      list = list.filter((b) => {
        const name = safeLower(b.fullName);
        const phonePretty = safeLower(e164ToLocalPretty(b.phoneNumber));
        const phoneRaw = safeLower(b.phoneNumber);
        return (
          name.includes(term) ||
          phonePretty.includes(term) ||
          phoneRaw.includes(term)
        );
      });
    }

    // past: الأحدث أولاً حتى تشوف آخر شيء صار
    list.sort((a, b) => {
      const da = b.cancelledAt
        ? new Date(b.cancelledAt)
        : new Date(`${b.selectedDate}T${b.selectedTime}:00`);
      const dbb = a.cancelledAt
        ? new Date(a.cancelledAt)
        : new Date(`${a.selectedDate}T${a.selectedTime}:00`);
      return da - dbb;
    });

    return list;
  }, [recentPast, searchTerm, serviceFilter]);

  const upcomingByDate = useMemo(() => {
    return Object.entries(
      filteredUpcoming.reduce((acc, b) => {
        (acc[b.selectedDate] = acc[b.selectedDate] || []).push(b);
        return acc;
      }, {})
    ).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredUpcoming]);

  return (
    <section className="min-h-screen bg-gray-100 pt-24 p-4 font-body" dir="rtl">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← الرجوع
          </button>

          <div className="text-center flex-1">
            <h1 className="text-xl font-extrabold text-gold">لوحة الحجوزات</h1>{" "}
            <p className="text-xs text-gray-500 mt-1">
              شوف القادم بسرعة، واتصل/ألغي بكبسة.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <FaSyncAlt className="opacity-70" />
            <span>
              آخر تحديث:{" "}
              {lastUpdated
                ? `${String(lastUpdated.getHours()).padStart(2, "0")}:${String(
                    lastUpdated.getMinutes()
                  ).padStart(2, "0")}`
                : "—"}
            </span>
          </div>
        </div>

        {/* Counters */}
        <div className="flex-1">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h1 className="text-xl font-extrabold text-gold">لوحة الحجوزات</h1>

            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-green-50 text-green-800 border-green-200">
              القادمة: {filteredUpcoming.length}
            </span>

            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-yellow-50 text-yellow-900 border-yellow-200">
              المنتهية: {filteredPast.length}
            </span>
          </div>
        </div>

        {/* Tools */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* Search */}
            <div className="flex-1">
              <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                <FaSearch className="opacity-70" />
                بحث (اسم / هاتف)
              </label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="اكتب اسم الزبون أو رقم الهاتف..."
                className="w-full rounded-xl border border-gray-200 px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-200 bg-white"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:flex gap-3">
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <FaFilter className="opacity-70" />
                  الخدمة
                </label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full sm:w-44 rounded-xl border border-gray-200px-3 py-1.5 text-sm  bg-white outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="all">الكل</option>
                  <option value="haircut">قص شعر</option>
                  <option value="beard">تعليم لحية</option>
                  <option value="both">قص + لحية</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  الترتيب
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  className="w-full sm:w-44 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="soonest">أقرب موعد</option>
                  <option value="newest">أحدث حجز</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-10 text-gray-500">جاري التحميل...</p>
        ) : (
          <div className="space-y-6">
            {/* Upcoming */}
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200">
              {" "}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-extrabold text-green-900">
                  📆 الحجوزات القادمة
                </h2>
                <span className="text-xs text-green-800 bg-white/70 border border-green-200 rounded-full px-3 py-1">
                  {filteredUpcoming.length} موعد
                </span>
              </div>
              {filteredUpcoming.length === 0 ? (
                <div className="rounded-xl bg-white border border-green-100 p-6 text-center">
                  <p className="text-gray-700 font-semibold">
                    ما في حجوزات قادمة.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingByDate.map(([date, bookings]) => {
                    const label = getDateLabel(date);
                    return (
                      <div
                        key={date}
                        className="rounded-2xl bg-white/60 border border-green-100 p-4"
                      >
                        <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Accent line */}
                              <div
                                className={`w-1.5 h-9 rounded-full ${
                                  label === "اليوم"
                                    ? "bg-green-500"
                                    : label === "بكرا"
                                    ? "bg-blue-500"
                                    : "bg-gray-300"
                                }`}
                              />

                              <div className="leading-tight">
                                <div className="text-base font-extrabold text-gray-900">
                                  {formatDateArabic(date)}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {bookings.length} حجوزات
                                </div>
                              </div>

                              {label && (
                                <span
                                  className={`text-xs font-bold rounded-full px-3 py-1 border ${
                                    label === "اليوم"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {label}
                                </span>
                              )}
                            </div>

                            <div className="text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
                              {bookings.length}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {bookings.map((b) => (
                            <div
                              key={b.id}
                              className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                {/* Left info */}
                                <div className="space-y-2">
                                  {/* Name + badges */}
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                      <FaUser className="text-gold mt-1 text-sm opacity-80" />
                                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                                        {b.fullName}
                                      </h3>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border ${serviceBadgeClasses(
                                          b.selectedService
                                        )}`}
                                      >
                                        <FaCut className="opacity-80" />
                                        {serviceLabel(b.selectedService)}
                                      </span>

                                      <span className="inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border bg-gray-900 text-white border-gray-900">
                                        <FaClock className="opacity-90" />
                                        {b.selectedTime}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Phone row */}
                                  <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="inline-flex items-center gap-2 text-gray-700">
                                      <FaPhone className="text-gray-400" />
                                      <a
                                        href={`tel:${b.phoneNumber}`}
                                        className="text-blue-700 font-semibold hover:underline"
                                      >
                                        {e164ToLocalPretty(b.phoneNumber)}
                                      </a>
                                    </span>
                                  </div>

                                  {/* Meta */}
                                  <div className="text-xs text-gray-500">
                                    تم الحجز: {formatDateTime(b.createdAt)}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex sm:flex-col gap-2 sm:items-end">
                                  <button
                                    onClick={() => handleCancel(b)}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                  >
                                    <FaTimesCircle />
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past */}
            <div className="bg-yellow-50 rounded-2xl shadow-sm p-4 border border-yellow-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-extrabold text-yellow-900">
                  🕘 الحجوزات المنتهية حديثًا
                </h2>
                <span className="text-xs text-yellow-900 bg-white/70 border border-yellow-200 rounded-full px-3 py-1">
                  {filteredPast.length} سجل
                </span>
              </div>

              {filteredPast.length === 0 ? (
                <div className="rounded-xl bg-white border border-yellow-100 p-6 text-center">
                  <p className="text-gray-700 font-semibold">
                    ما في حجوزات منتهية حالياً.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    الإلغاءات والمنتهية رح تظهر هون.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPast.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Info */}
                        <div className="space-y-2">
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <FaUser className="text-gold mt-1 text-sm opacity-80" />
                              <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                                {b.fullName}
                              </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border ${serviceBadgeClasses(
                                  b.selectedService
                                )}`}
                              >
                                <FaCut className="opacity-80" />
                                {serviceLabel(b.selectedService)}
                              </span>

                              <span className="inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border bg-gray-900 text-white border-gray-900">
                                <FaClock className="opacity-90" />
                                {b.selectedTime}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                            <span className="inline-flex items-center gap-2">
                              <FaPhone className="text-gray-400" />
                              <a
                                href={`tel:${b.phoneNumber}`}
                                className="text-blue-700 font-semibold hover:underline"
                              >
                                {e164ToLocalPretty(b.phoneNumber)}
                              </a>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                            <span className="inline-flex items-center gap-2">
                              <FaCalendarAlt className="text-gray-400" />
                              {formatDateArabic(b.selectedDate)}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <FaClock className="text-gray-400" />
                              {b.selectedTime}
                            </span>
                          </div>

                          {b.cancelledAt && (
                            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 inline-block">
                              🚫 تم الإلغاء: {formatDateTime(b.cancelledAt)}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 sm:items-end">
                          {b.cancelledAt && (
                            <button
                              onClick={() => handleRestore(b)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
                            >
                              <FaUndo />
                              استرجاع
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(b)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                          >
                            <FaTrash />
                            حذف نهائي
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="text-center text-xs text-gray-500">
              💡 تلميح للحلاق: استخدم البحث للزبون، واضغط اتصال مباشرة — والباقي
              كبسة.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
