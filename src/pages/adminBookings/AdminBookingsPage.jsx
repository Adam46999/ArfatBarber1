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

  /*
   * حالات البحث والفلترة.
   */
  const [searchTerm, setSearchTerm] = useState("");

  const [serviceFilter, setServiceFilter] = useState("all");

  const [sortMode, setSortMode] = useState("soonest");

  const [showPast, setShowPast] = useState(true);

  /*
   * الوضع المضغوط وتفاصيل الكروت.
   */
  const [compactMode, setCompactMode] = useState(true);

  const [expandedIds, setExpandedIds] = useState({});

  function toggleExpanded(id) {
    setExpandedIds((previous) => ({
      ...previous,

      [id]: !previous[id],
    }));
  }

  /*
   * فتح وإغلاق أدوات البحث والفلترة.
   */
  const [toolsOpen, setToolsOpen] = useState(false);

  /**
   * فلترة وترتيب الحجوزات القادمة.
   */
  const filteredUpcoming = useMemo(() => {
    const term = safeLower(searchTerm).trim();

    let list = [...upcoming];

    if (serviceFilter !== "all") {
      list = list.filter(
        (booking) => booking.selectedService === serviceFilter,
      );
    }

    if (term) {
      list = list.filter((booking) => {
        const name = safeLower(booking.fullName);

        const prettyPhone = safeLower(e164ToLocalPretty(booking.phoneNumber));

        const rawPhone = safeLower(booking.phoneNumber);

        return (
          name.includes(term) ||
          prettyPhone.includes(term) ||
          rawPhone.includes(term)
        );
      });
    }

    if (sortMode === "newest") {
      list.sort((firstBooking, secondBooking) => {
        const firstCreatedAt =
          typeof firstBooking.createdAt === "string"
            ? new Date(firstBooking.createdAt)
            : (firstBooking.createdAt?.toDate?.() ?? new Date(0));

        const secondCreatedAt =
          typeof secondBooking.createdAt === "string"
            ? new Date(secondBooking.createdAt)
            : (secondBooking.createdAt?.toDate?.() ?? new Date(0));

        return secondCreatedAt - firstCreatedAt;
      });
    } else {
      list.sort((firstBooking, secondBooking) => {
        const firstDate = new Date(
          `${firstBooking.slotDate || firstBooking.selectedDate}T${firstBooking.selectedTime}:00`,
        );

        const secondDate = new Date(
          `${secondBooking.slotDate || secondBooking.selectedDate}T${secondBooking.selectedTime}:00`,
        );

        return firstDate - secondDate;
      });
    }

    return list;
  }, [upcoming, searchTerm, serviceFilter, sortMode]);

  /**
   * فلترة وترتيب السجل المؤقت.
   */
  const filteredPast = useMemo(() => {
    const term = safeLower(searchTerm).trim();

    let list = [...recentPast];

    if (serviceFilter !== "all") {
      list = list.filter(
        (booking) => (booking.selectedService ?? "both") === serviceFilter,
      );
    }

    if (term) {
      list = list.filter((booking) => {
        const name = safeLower(booking.fullName);

        const prettyPhone = safeLower(e164ToLocalPretty(booking.phoneNumber));

        const rawPhone = safeLower(booking.phoneNumber);

        return (
          name.includes(term) ||
          prettyPhone.includes(term) ||
          rawPhone.includes(term)
        );
      });
    }

    list.sort((firstBooking, secondBooking) => {
      function toDate(value, fallback) {
        if (typeof value === "string") {
          return new Date(value);
        }

        if (value?.toDate) {
          return value.toDate();
        }

        return new Date(fallback);
      }

      const firstDate = toDate(
        firstBooking.cancelledAt,
        `${firstBooking.slotDate || firstBooking.selectedDate}T${firstBooking.selectedTime}:00`,
      );

      const secondDate = toDate(
        secondBooking.cancelledAt,
        `${secondBooking.slotDate || secondBooking.selectedDate}T${secondBooking.selectedTime}:00`,
      );

      return secondDate - firstDate;
    });

    return list;
  }, [recentPast, searchTerm, serviceFilter]);

  /**
   * تجميع الحجوزات القادمة حسب التاريخ.
   */
  const upcomingByDate = useMemo(() => {
    const grouped = filteredUpcoming.reduce((result, booking) => {
      if (!result[booking.selectedDate]) {
        result[booking.selectedDate] = [];
      }

      result[booking.selectedDate].push(booking);

      return result;
    }, {});

    return Object.entries(grouped).sort(([firstDate], [secondDate]) =>
      firstDate.localeCompare(secondDate),
    );
  }, [filteredUpcoming]);

  /*
   * أول حجز بالقائمة هو الدور الجاي.
   */
  const nextId = filteredUpcoming[0]?.id ?? null;

  return (
    <section
      className="
        min-h-screen
        bg-gray-100
        p-4 pt-24
        font-body
      "
      dir="rtl"
    >
      <div
        className="
          mx-auto max-w-5xl
          space-y-4
          rounded-2xl bg-white
          p-4 shadow-xl
          sm:p-6
        "
      >
        {/* ملخص الحجوزات */}
        <section
          className="
            grid grid-cols-2 gap-2
            rounded-[22px] border border-slate-200
            bg-slate-50 p-2.5
            sm:grid-cols-[1fr_1fr_auto]
            sm:items-stretch
          "
        >
          <div
            className="
              rounded-2xl border border-emerald-100
              bg-white px-3 py-3
              shadow-[0_3px_12px_rgba(15,23,42,0.04)]
            "
          >
            <div className="text-[10px] font-black text-emerald-600">
              القادمة
            </div>

            <div className="mt-1 flex items-end gap-1.5">
              <span className="text-2xl font-black leading-none text-slate-950">
                {filteredUpcoming.length}
              </span>

              <span className="pb-0.5 text-[10px] font-bold text-slate-400">
                حجز
              </span>
            </div>
          </div>

          <div
            className="
              rounded-2xl border border-amber-100
              bg-white px-3 py-3
              shadow-[0_3px_12px_rgba(15,23,42,0.04)]
            "
          >
            <div className="text-[10px] font-black text-amber-600">
              السجل
            </div>

            <div className="mt-1 flex items-end gap-1.5">
              <span className="text-2xl font-black leading-none text-slate-950">
                {filteredPast.length}
              </span>

              <span className="pb-0.5 text-[10px] font-bold text-slate-400">
                حجز
              </span>
            </div>
          </div>

          <div
            className="
              col-span-2 flex min-h-[58px]
              items-center justify-between gap-3
              rounded-2xl border border-slate-200
              bg-white px-3
              sm:col-span-1 sm:min-w-[150px]
            "
          >
            <div>
              <div className="text-[10px] font-black text-slate-400">
                آخر تحديث
              </div>

              <div className="mt-1 text-sm font-black text-slate-700">
                {lastUpdated
                  ? `${String(lastUpdated.getHours()).padStart(
                      2,
                      "0",
                    )}:${String(lastUpdated.getMinutes()).padStart(2, "0")}`
                  : "—"}
              </div>
            </div>

            <FaSyncAlt className="text-slate-300" aria-hidden="true" />
          </div>
        </section>


        {/* أدوات البحث والفلترة */}
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
            <div
              className="
                h-20 animate-pulse
                rounded-2xl
                border border-gray-200
                bg-gray-100
              "
            />

            <div
              className="
                h-28 animate-pulse
                rounded-2xl
                border border-gray-200
                bg-gray-100
              "
            />

            <div
              className="
                h-28 animate-pulse
                rounded-2xl
                border border-gray-200
                bg-gray-100
              "
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* الحجوزات القادمة */}
            <div
              className="
                rounded-2xl
                border border-gray-200
                bg-white p-3
                sm:p-4
              "
            >
              <div className="mb-3 flex items-center justify-between">
                <h2
                  className="
                    text-base font-extrabold
                    text-gray-900
                    sm:text-lg
                  "
                >
                  📆 الحجوزات القادمة
                </h2>

                <span
                  className="
                    rounded-full
                    border border-emerald-200
                    bg-emerald-50
                    px-3 py-1
                    text-[11px] font-bold
                    text-emerald-800
                  "
                >
                  {filteredUpcoming.length} موعد
                </span>
              </div>

              {filteredUpcoming.length === 0 ? (
                <div
                  className="
                    rounded-xl
                    border border-gray-200
                    bg-gray-50 p-6
                    text-center
                  "
                >
                  <p className="font-extrabold text-gray-900">
                    لا توجد حجوزات.
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
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
                      onCancel={(booking) => actions.cancelBooking(booking)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* السجل المؤقت */}
            <PastSection
              showPast={showPast}
              setShowPast={setShowPast}
              filteredPast={filteredPast}
              compactMode={compactMode}
              onRestore={(booking) => actions.restoreBooking(booking, upcoming)}
              onDelete={(booking, mode) =>
                actions.deleteBookingForever(booking, mode)
              }
            />

            <div className="text-center text-[11px] text-gray-400">
              بحث بالاسم أو الهاتف ← اتصال ← وإذا لزم: إلغاء أو استرجاع أو حذف.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}



