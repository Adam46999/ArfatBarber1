// src/pages/adminBookings/PastSection.jsx
import { useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaPhone,
  FaTrash,
  FaUndo,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { e164ToLocalPretty } from "../../utils/phone";
import {
  formatDateArabic,
  formatDateTime,
  serviceBadgeClasses,
  serviceLabel,
} from "./helpers";

export default function PastSection({
  showPast,
  setShowPast,
  filteredPast,
  onRestore,
  onDelete,
  compactMode,
}) {
  const [expandedPastIds, setExpandedPastIds] = useState({});

  const togglePastExpanded = (id) => {
    setExpandedPastIds((p) => ({ ...p, [id]: !p[id] }));
  };

  const timePillClasses =
    "inline-flex items-center gap-2 text-xs font-extrabold rounded-full px-3 py-1 border " +
    "bg-indigo-600 text-white border-indigo-600";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-extrabold text-amber-900">
            🕘 السجل (منتهية / ملغية)
          </h2>
          <span className="text-[11px] font-bold bg-white text-amber-900 border border-amber-200 rounded-full px-3 py-1">
            {filteredPast.length}
          </span>
        </div>

        <button
          onClick={() => setShowPast((s) => !s)}
          className="text-sm font-extrabold text-amber-900 hover:text-amber-950"
          aria-label="عرض أو إخفاء السجل"
        >
          {showPast ? "إخفاء السجل" : `عرض السجل (${filteredPast.length})`}
        </button>
      </div>

      {!showPast ? (
        <div className="mt-3 text-xs text-amber-800/70">
          السجل مطوي لتسهيل الشغل. افتحه عند الحاجة.
        </div>
      ) : filteredPast.length === 0 ? (
        <div className="rounded-xl bg-white border border-amber-200 p-6 text-center mt-3">
          <p className="text-amber-950 font-extrabold">لا يوجد سجل.</p>
          <p className="text-xs text-amber-800/70 mt-1">
            الإلغاءات والمنتهية ستظهر هنا.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mt-3">
          {filteredPast.map((b) => {
            const name = b.fullName || "بدون اسم";
            const expanded = Boolean(expandedPastIds[b.id]);

            // ✅ مضغوط للسجل
            if (compactMode) {
              return (
                <div
                  key={b.id}
                  className="rounded-2xl bg-white border border-amber-200 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => togglePastExpanded(b.id)}
                    className="w-full text-right px-3 py-3 flex items-center justify-between gap-3"
                    aria-label="فتح تفاصيل السجل"
                  >
                    <span className="text-sm sm:text-base font-black text-gray-900 truncate">
                      {name}
                    </span>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={timePillClasses}>
                        <FaClock className="opacity-90" />
                        {b.selectedTime}
                      </span>

                      <span className="text-[11px] text-amber-900 inline-flex items-center gap-1">
                        {expanded ? <FaChevronUp /> : <FaChevronDown />}
                        {expanded ? "إغلاق" : "تفاصيل"}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <a
                          href={`tel:${b.phoneNumber}`}
                          className="inline-flex items-center gap-2 text-sm font-extrabold px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          title="اتصال"
                        >
                          <FaPhone className="opacity-80" />
                          اتصال
                          <span className="font-semibold opacity-90">
                            {e164ToLocalPretty(b.phoneNumber)}
                          </span>
                        </a>

                        {b.selectedService && (
                          <span
                            className={`inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border ${serviceBadgeClasses(
                              b.selectedService
                            )}`}
                          >
                            {serviceLabel(b.selectedService)}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <FaCalendarAlt className="text-gray-400" />
                          {formatDateArabic(b.selectedDate)}
                        </span>
                      </div>

                      {b.cancelledAt && (
                        <div className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 inline-block mb-3">
                          🚫 تم الإلغاء: {formatDateTime(b.cancelledAt)}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                        {b.cancelledAt && (
                          <button
                            onClick={() => onRestore(b)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            aria-label="استرجاع الحجز"
                          >
                            <FaUndo />
                            استرجاع
                          </button>
                        )}

                        <button
                          onClick={() => onDelete(b)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                          aria-label="حذف نهائي"
                        >
                          <FaTrash />
                          حذف نهائي
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // ✅ مريح للسجل (زي قبل بس مع لون القسم)
            return (
              <div
                key={b.id}
                className="rounded-2xl bg-white border border-amber-200 shadow-sm p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-snug whitespace-normal break-words">
                        {name}
                      </h3>

                      <span className={timePillClasses}>
                        <FaClock className="opacity-90" />
                        {b.selectedTime}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`tel:${b.phoneNumber}`}
                        className="inline-flex items-center gap-2 text-sm font-extrabold px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        title="اتصال"
                      >
                        <FaPhone className="opacity-80" />
                        اتصال
                        <span className="font-semibold opacity-90">
                          {e164ToLocalPretty(b.phoneNumber)}
                        </span>
                      </a>

                      {b.selectedService && (
                        <span
                          className={`inline-flex items-center gap-2 text-xs font-bold rounded-full px-3 py-1 border ${serviceBadgeClasses(
                            b.selectedService
                          )}`}
                        >
                          {serviceLabel(b.selectedService)}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <FaCalendarAlt className="text-gray-400" />
                        {formatDateArabic(b.selectedDate)}
                      </span>
                    </div>

                    {b.cancelledAt && (
                      <div className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 inline-block">
                        🚫 تم الإلغاء: {formatDateTime(b.cancelledAt)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    {b.cancelledAt && (
                      <button
                        onClick={() => onRestore(b)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        aria-label="استرجاع الحجز"
                      >
                        <FaUndo />
                        استرجاع
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(b)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      aria-label="حذف نهائي"
                    >
                      <FaTrash />
                      حذف نهائي
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
