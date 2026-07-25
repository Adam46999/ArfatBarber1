// src/pages/adminBookings/PastSection.jsx
import { useState } from "react";
import {
  FaCalendarAlt,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaPhone,
  FaTrash,
  FaUndo,
  FaUserSlash,
} from "react-icons/fa";

import { e164ToLocalPretty } from "../../utils/phone";

import {
  formatDateArabic,
  formatDateTime,
  serviceBadgeClasses,
  serviceLabel,
} from "./helpers";

/**
 * يفحص هل وصل وقت بداية الدور.
 */
function bookingStarted(booking) {
  const date = new Date(
    `${booking?.selectedDate || ""}T${booking?.selectedTime || "00:00"}:00`,
  );

  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

/**
 * نافذة الحذف النهائي.
 *
 * إذا بدأ وقت الدور ولم يكن ملغيًا:
 *
 * - الزبون ما إجا:
 *   ينحذف الدور وينقص من الإحصائيات.
 *
 * - حذف فقط:
 *   تنحذف تفاصيل الدور لكنه يظل محسوبًا.
 *
 * إذا كان الحجز ملغيًا:
 * ينحذف من السجل فقط لأنه غير محسوب أصلًا.
 */
function DeleteBookingDialog({ booking, onClose, onDelete, deleting }) {
  if (!booking) return null;

  const cancelled = Boolean(booking.cancelledAt);
  const started = bookingStarted(booking);

  const showStatsChoices = started && !cancelled;

  const name =
    booking.fullName || booking.customerName || booking.name || "الزبون";

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-end justify-center
        bg-slate-950/55 p-3
        sm:items-center
      "
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="تأكيد حذف الحجز"
      onClick={() => {
        if (!deleting) onClose();
      }}
    >
      <div
        className="
          w-full max-w-md
          rounded-3xl bg-white
          p-5 shadow-2xl
          sm:p-6
        "
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-red-600">حذف نهائي</p>

            <h3 className="mt-1 truncate text-xl font-black text-slate-950">
              {name}
            </h3>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {formatDateArabic(booking.selectedDate)} • {booking.selectedTime}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="
              shrink-0 rounded-xl
              bg-slate-100 px-3 py-2
              text-sm font-black text-slate-600
              transition
              hover:bg-slate-200
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            إغلاق
          </button>
        </div>

        {showStatsChoices ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold leading-6 text-slate-600">
              اختار سبب الحذف حتى تظل الإحصائيات صحيحة:
            </p>

            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(booking, "NO_SHOW")}
              className="
                flex w-full items-start gap-3
                rounded-2xl
                border border-red-200
                bg-red-50 p-4
                text-right
                transition
                hover:bg-red-100
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <span
                className="
                  mt-0.5 flex h-10 w-10
                  shrink-0 items-center justify-center
                  rounded-xl bg-red-600 text-white
                "
              >
                <FaUserSlash />
              </span>

              <span>
                <span className="block font-black text-red-800">
                  الزبون ما إجا
                </span>

                <span
                  className="
                    mt-1 block
                    text-xs font-bold
                    leading-5 text-red-600
                  "
                >
                  ما صار دور فعلي، لذلك ينحذف وينقص من إحصائيات الشهر.
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(booking, "DELETE_ONLY")}
              className="
                flex w-full items-start gap-3
                rounded-2xl
                border border-slate-200
                bg-slate-50 p-4
                text-right
                transition
                hover:bg-slate-100
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <span
                className="
                  mt-0.5 flex h-10 w-10
                  shrink-0 items-center justify-center
                  rounded-xl bg-slate-800 text-white
                "
              >
                <FaTrash />
              </span>

              <span>
                <span className="block font-black text-slate-900">حذف فقط</span>

                <span
                  className="
                    mt-1 block
                    text-xs font-bold
                    leading-5 text-slate-500
                  "
                >
                  الدور صار فعلًا؛ نحذف تفاصيله من السجل ويظل محسوبًا.
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <p
              className="
                rounded-2xl bg-slate-50
                px-4 py-3
                text-sm font-bold
                leading-6 text-slate-600
              "
            >
              هذا الحجز ملغي، لذلك هو غير محسوب بالإحصائيات. الحذف سيزيله من
              السجل فقط.
            </p>

            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(booking, "DELETE_ONLY")}
              className="
                mt-3 inline-flex w-full
                items-center justify-center gap-2
                rounded-2xl bg-red-600
                px-4 py-3
                text-sm font-black text-white
                transition
                hover:bg-red-700
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <FaTrash />

              {deleting ? "جاري الحذف..." : "حذف الحجز نهائيًا"}
            </button>
          </div>
        )}

        {deleting && showStatsChoices ? (
          <p className="mt-4 text-center text-sm font-black text-slate-500">
            جاري تنفيذ الحذف...
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * تفاصيل الحجز الموجودة داخل سجل الحجوزات
 * الملغية والمنتهية.
 */
function BookingDetails({ booking, onRestore, onRequestDelete }) {
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <a
          href={`tel:${booking.phoneNumber}`}
          className="
            inline-flex items-center gap-2
            rounded-xl
            border border-blue-200
            bg-blue-50
            px-4 py-2
            text-sm font-extrabold
            text-blue-800
            transition
            hover:bg-blue-100
            focus:outline-none
            focus:ring-2
            focus:ring-blue-200
          "
          title="اتصال"
        >
          <FaPhone className="opacity-80" />
          اتصال
          <span className="font-semibold opacity-90">
            {e164ToLocalPretty(booking.phoneNumber)}
          </span>
        </a>

        {booking.selectedService ? (
          <span
            className={`
              inline-flex items-center gap-2
              rounded-full border
              px-3 py-1
              text-xs font-bold
              ${serviceBadgeClasses(booking.selectedService)}
            `}
          >
            {serviceLabel(booking.selectedService)}
          </span>
        ) : null}

        <span className="inline-flex items-center gap-2 text-sm text-gray-700">
          <FaCalendarAlt className="text-gray-400" />

          {formatDateArabic(booking.selectedDate)}
        </span>
      </div>

      {booking.cancelledAt ? (
        <div
          className="
            mb-3 inline-block
            rounded-xl
            border border-red-200
            bg-red-50
            px-3 py-2
            text-[11px] font-semibold
            text-red-700
          "
        >
          🚫 تم الإلغاء: {formatDateTime(booking.cancelledAt)}
        </div>
      ) : (
        <div
          className="
            mb-3 inline-block
            rounded-xl
            border border-emerald-200
            bg-emerald-50
            px-3 py-2
            text-[11px] font-semibold
            text-emerald-700
          "
        >
          ✓ مرّ وقت الدور بدون إلغاء
        </div>
      )}

      <div
        className="
          flex flex-col gap-2
          sm:flex-row
          sm:items-center
          sm:justify-end
        "
      >
        {booking.cancelledAt ? (
          <button
            type="button"
            onClick={() => onRestore(booking)}
            className="
              inline-flex w-full
              items-center justify-center gap-2
              rounded-xl
              border border-emerald-200
              bg-emerald-50
              px-4 py-2
              text-sm font-bold
              text-emerald-800
              transition
              hover:bg-emerald-100
              focus:outline-none
              focus:ring-2
              focus:ring-emerald-200
              sm:w-auto
            "
            aria-label="استرجاع الحجز"
          >
            <FaUndo />
            استرجاع
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onRequestDelete(booking)}
          className="
            inline-flex w-full
            items-center justify-center gap-2
            rounded-xl
            border border-gray-200
            bg-gray-50
            px-4 py-2
            text-sm font-bold
            text-gray-700
            transition
            hover:border-red-200
            hover:bg-red-50
            hover:text-red-700
            focus:outline-none
            focus:ring-2
            focus:ring-red-200
            sm:w-auto
          "
          aria-label="حذف نهائي"
        >
          <FaTrash />
          حذف نهائي
        </button>
      </div>
    </>
  );
}

export default function PastSection({
  showPast,
  setShowPast,
  filteredPast,
  onRestore,
  onDelete,
  compactMode,
}) {
  const [expandedPastIds, setExpandedPastIds] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deleting, setDeleting] = useState(false);

  const togglePastExpanded = (id) => {
    setExpandedPastIds((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  async function handleDelete(booking, mode) {
    try {
      setDeleting(true);

      await onDelete(booking, mode);

      setDeleteTarget(null);
    } catch (error) {
      console.error("delete booking failed:", error);

      window.alert("حدث خطأ أثناء حذف الحجز. حاول مرة أخرى.");
    } finally {
      setDeleting(false);
    }
  }

  const timePillClasses = `
    inline-flex items-center gap-2
    rounded-full
    border border-indigo-600
    bg-indigo-600
    px-3 py-1
    text-xs font-extrabold
    text-white
  `;

  return (
    <>
      <div
        className="
          rounded-2xl
          border border-amber-200
          bg-amber-50/60
          p-3
          sm:p-4
        "
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              className="
                truncate
                text-base font-extrabold
                text-amber-900
                sm:text-lg
              "
            >
              🕘 السجل
            </h2>

            <span
              className="
                shrink-0 rounded-full
                border border-amber-200
                bg-white
                px-3 py-1
                text-[11px] font-bold
                text-amber-900
              "
            >
              {filteredPast.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPast((current) => !current)}
            className="
              shrink-0
              text-sm font-extrabold
              text-amber-900
              transition
              hover:text-amber-950
            "
            aria-label="عرض أو إخفاء السجل"
          >
            {showPast ? "إخفاء السجل" : `عرض السجل (${filteredPast.length})`}
          </button>
        </div>

        {!showPast ? (
          <div className="mt-3 text-xs text-amber-800/70">
            الحجوزات المنتهية والملغية مخفية لتسهيل الشغل.
          </div>
        ) : filteredPast.length === 0 ? (
          <div
            className="
              mt-3 rounded-xl
              border border-amber-200
              bg-white p-6
              text-center
            "
          >
            <p className="font-extrabold text-amber-950">لا يوجد سجل.</p>

            <p className="mt-1 text-xs text-amber-800/70">
              الحجوزات الملغية والمنتهية ستظهر هنا لساعتين.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {filteredPast.map((booking) => {
              const name =
                booking.fullName ||
                booking.customerName ||
                booking.name ||
                "بدون اسم";

              const expanded = Boolean(expandedPastIds[booking.id]);

              if (compactMode) {
                return (
                  <div
                    key={booking.id}
                    className="
                        rounded-2xl
                        border border-amber-200
                        bg-white shadow-sm
                      "
                  >
                    <button
                      type="button"
                      onClick={() => togglePastExpanded(booking.id)}
                      className="
                          flex w-full
                          items-center
                          justify-between
                          gap-3
                          px-3 py-3
                          text-right
                        "
                      aria-label="فتح تفاصيل السجل"
                    >
                      <span
                        className="
                            truncate
                            text-sm font-black
                            text-gray-900
                            sm:text-base
                          "
                      >
                        {name}
                      </span>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={timePillClasses}>
                          <FaClock className="opacity-90" />

                          {booking.selectedTime}
                        </span>

                        <span
                          className="
                              inline-flex
                              items-center gap-1
                              text-[11px]
                              text-amber-900
                            "
                        >
                          {expanded ? <FaChevronUp /> : <FaChevronDown />}

                          {expanded ? "إغلاق" : "تفاصيل"}
                        </span>
                      </div>
                    </button>

                    {expanded ? (
                      <div className="px-3 pb-3">
                        <BookingDetails
                          booking={booking}
                          onRestore={onRestore}
                          onRequestDelete={setDeleteTarget}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <div
                  key={booking.id}
                  className="
                      rounded-2xl
                      border border-amber-200
                      bg-white
                      p-3 shadow-sm
                      sm:p-4
                    "
                >
                  <div
                    className="
                        flex flex-col gap-3
                        sm:flex-row
                        sm:items-start
                        sm:justify-between
                      "
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className="
                              break-words
                              text-lg font-black
                              leading-snug
                              text-gray-900
                              sm:text-xl
                            "
                        >
                          {name}
                        </h3>

                        <span className={timePillClasses}>
                          <FaClock className="opacity-90" />

                          {booking.selectedTime}
                        </span>
                      </div>

                      <BookingDetails
                        booking={booking}
                        onRestore={onRestore}
                        onRequestDelete={setDeleteTarget}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <DeleteBookingDialog
          booking={deleteTarget}
          deleting={deleting}
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}
