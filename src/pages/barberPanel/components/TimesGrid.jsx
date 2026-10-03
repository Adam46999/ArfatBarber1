import { useState } from "react";

export default function TimesGrid({
  times,
  selectedDate,
  slotDateByTime = {},
  bookings,
  blockedTimes,
  selectedTimes,
  recentChange,
  onToggleTime,
}) {
  const [selectedBookedTime, setSelectedBookedTime] = useState("");

  const selectedBookedBooking = bookings.find(
    (booking) =>
      (booking.slotDate || booking.selectedDate) ===
        (slotDateByTime[selectedBookedTime] || selectedDate) &&
      booking.selectedTime === selectedBookedTime &&
      !booking.cancelledAt,
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
        {times.map((time) => {
          const bookedBooking = bookings.find(
            (booking) =>
              (booking.slotDate || booking.selectedDate) ===
                (slotDateByTime[time] || selectedDate) &&
              booking.selectedTime === time &&
              !booking.cancelledAt,
          );

          const booked = Boolean(bookedBooking);
          const isBlocked = blockedTimes.includes(time);
          const isSelected = selectedTimes.includes(time);
          const isRecentChange =
            recentChange?.date === selectedDate &&
            recentChange.times?.includes(time);

          return (
            <button
              key={time}
              type="button"
              onClick={() => {
                if (booked) {
                  setSelectedBookedTime((current) =>
                    current === time ? "" : time,
                  );
                  return;
                }

                setSelectedBookedTime("");
                onToggleTime(time);
              }}
              className={`min-h-12 rounded-2xl border px-2 py-2.5 text-center text-sm font-black shadow-sm transition-all duration-200 active:scale-[0.97] ${
                booked
                  ? "cursor-pointer border-red-700 bg-gradient-to-b from-red-600 to-red-700 text-white shadow-red-100"
                  : isBlocked
                    ? "border-red-200 bg-gradient-to-b from-red-50 to-red-100 text-red-700"
                    : isSelected
                      ? "border-amber-400 bg-gradient-to-b from-amber-100 to-amber-200 text-amber-900 ring-2 ring-amber-300"
                      : "border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-800 hover:border-emerald-300 hover:from-emerald-100 hover:to-emerald-200"
              }`}
              title={
                booked
                  ? "اضغط لعرض اسم الزبون"
                  : isBlocked
                    ? "هذه الساعة محظورة"
                    : "اضغط للحظر/الإلغاء"
              }
            >
              {time}
            </button>
          );
        })}
      </div>

      {selectedBookedBooking ? (
        <div className="-mt-2 mb-6 rounded-2xl border border-red-200 bg-gradient-to-b from-red-50 to-white px-4 py-3.5 text-center shadow-sm">
          <p className="text-xs font-black text-red-600">هذا الدور محجوز</p>
          <p className="mt-1 text-base font-black text-slate-900">
            👤 {selectedBookedBooking.fullName || "اسم الزبون غير متوفر"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-600">
            الساعة {selectedBookedBooking.selectedTime}
          </p>
        </div>
      ) : null}
    </>
  );
}


