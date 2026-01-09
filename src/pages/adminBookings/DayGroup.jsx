// src/pages/adminBookings/DayGroup.jsx
import BookingCard from "./BookingCard";
import { formatDateArabic, getDateLabel } from "./helpers";

export default function DayGroup({
  date,
  bookings,
  nextId,
  compactMode,
  expandedIds,
  toggleExpanded,
  onCancel,
}) {
  const label = getDateLabel(date);

  // ✅ عدّل الرقم إذا الهيدر عندك أعلى/أقل بالموبايل
  const HEADER_OFFSET_PX = 80;

  const accent =
    label === "اليوم"
      ? "bg-emerald-500"
      : label === "بكرا"
      ? "bg-sky-500"
      : "bg-indigo-500";

  const badge =
    label === "اليوم"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : label === "بكرا"
      ? "bg-sky-50 text-sky-800 border-sky-200"
      : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200">
      {/* ✅ Header واحد: واضح كبداية يوم + Sticky أثناء السكرول */}
      <div
        className="sticky px-3 pt-3 z-10"
        style={{ top: `${HEADER_OFFSET_PX}px` }}
      >
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-2 h-10 rounded-full ${accent}`} />

              <div className="min-w-0 leading-tight">
                <div className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                  {formatDateArabic(date)}
                </div>

                {/* ✅ واضح كبداية يوم */}
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {bookings.length} حجوزات
                </div>
              </div>

              {label ? (
                <span
                  className={`shrink-0 text-[11px] font-bold rounded-full px-3 py-1 border ${badge}`}
                >
                  {label}
                </span>
              ) : null}
            </div>

            {/* ✅ شريط جانبي قوي للتمييز أثناء السكرول */}
            <div className={`w-1.5 h-10 rounded-full ${accent}`} />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-3 space-y-3 pt-3">
        {bookings.map((b) => {
          const isNext = b.id === nextId;
          const expanded = Boolean(expandedIds[b.id]);

          return (
            <BookingCard
              key={b.id}
              booking={b}
              isNext={isNext}
              compactMode={compactMode}
              expanded={expanded}
              onToggleExpanded={() => toggleExpanded(b.id)}
              onCancel={() => onCancel(b)}
            />
          );
        })}
      </div>
    </div>
  );
}
