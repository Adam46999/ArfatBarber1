// src/pages/adminBookings/AdminBookingsPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt } from "react-icons/fa";
import { e164ToLocalPretty } from "../../utils/phone";

import Toolbar from "./Toolbar";
import DayGroup from "./DayGroup";
import PastSection from "./PastSection";
import { safeLower } from "./helpers";
import { useAdminBookingsData } from "./useAdminBookingsData";

export default function AdminBookingsPage() {
  const navigate = useNavigate();

  const { upcoming, recentPast, loading, lastUpdated, actions } =
    useAdminBookingsData();

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sortMode, setSortMode] = useState("soonest");
  const [showPast, setShowPast] = useState(true);

  // ✅ Compact + expanded
  const [compactMode, setCompactMode] = useState(true);
  const [expandedIds, setExpandedIds] = useState({});
  const toggleExpanded = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ✅ Toolbar collapsible
  const [toolsOpen, setToolsOpen] = useState(false);

  // Filter upcoming
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

  // Filter past
  const filteredPast = useMemo(() => {
    const term = safeLower(searchTerm).trim();
    let list = [...recentPast];

    if (serviceFilter !== "all") {
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

  const nextId = filteredUpcoming[0]?.id ?? null;

  return (
    <section className="min-h-screen bg-gray-100 pt-24 p-4 font-body" dir="rtl">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-700 hover:text-blue-900 text-sm font-semibold"
          >
            ← الرجوع
          </button>

          <div className="flex-1">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-gold">
                لوحة الحجوزات
              </h1>

              <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                القادمة: {filteredUpcoming.length}
              </span>

              <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-yellow-50 text-yellow-900 border-yellow-200">
                السجل: {filteredPast.length}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
            <FaSyncAlt className="opacity-70" />
            <span>
              {lastUpdated
                ? `آخر تحديث: ${String(lastUpdated.getHours()).padStart(
                    2,
                    "0"
                  )}:${String(lastUpdated.getMinutes()).padStart(2, "0")}`
                : "آخر تحديث: —"}
            </span>
          </div>
        </div>

        {/* ✅ Toolbar (collapsible + نفس ارتفاع المضغوط) */}
        <Toolbar
          toolsOpen={toolsOpen}
          setToolsOpen={setToolsOpen}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          compactMode={compactMode}
          setCompactMode={setCompactMode}
        />

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-gray-100 border border-gray-200 animate-pulse" />
            <div className="h-28 rounded-2xl bg-gray-100 border border-gray-200 animate-pulse" />
            <div className="h-28 rounded-2xl bg-gray-100 border border-gray-200 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upcoming */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  📆 الحجوزات القادمة
                </h2>
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-3 py-1">
                  {filteredUpcoming.length} موعد
                </span>
              </div>

              {filteredUpcoming.length === 0 ? (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
                  <p className="text-gray-900 font-extrabold">
                    لا توجد حجوزات.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    أي حجز جديد سيظهر هنا تلقائيًا.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingByDate.map(([date, bookings]) => (
                    <DayGroup
                      key={date}
                      date={date}
                      bookings={bookings}
                      nextId={nextId}
                      compactMode={compactMode}
                      expandedIds={expandedIds}
                      toggleExpanded={toggleExpanded}
                      onCancel={(b) => actions.cancelBooking(b)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Past */}
            <PastSection
              showPast={showPast}
              setShowPast={setShowPast}
              filteredPast={filteredPast}
              compactMode={compactMode}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onRestore={(b) => actions.restoreBooking(b, upcoming)}
              onDelete={(b) => actions.deleteBookingForever(b)}
            />

            <div className="text-center text-[11px] text-gray-400">
              بحث بالاسم/الهاتف → اتصال → وإذا لزم: إلغاء/استرجاع/حذف.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
