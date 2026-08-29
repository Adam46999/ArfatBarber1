import { useState } from "react";

export default function TimesGrid({
  times,
  selectedDate,
  bookings,
  blockedTimes,
  selectedTimes,
  onToggleTime,
}) {
  const [selectedBookedTime, setSelectedBookedTime] = useState("");

  const selectedBookedBooking = bookings.find(
    (booking) =>
      booking.selectedDate === selectedDate &&
      booking.selectedTime === selectedBookedTime &&
      !booking.cancelledAt,
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
        {times.map((time) => {
          const bookedBooking = bookings.find(
            (booking) =>
              booking.selectedDate === selectedDate &&
              booking.selectedTime === time &&
              !booking.cancelledAt,
          );

          const booked = Boolean(bookedBooking);
          const isBlocked = blockedTimes.includes(time);
          const isSelected = selectedTimes.includes(time);

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
              className={`rounded-xl py-2 text-center text-sm font-medium transition-all duration-200 ${
                booked
                  ? "cursor-pointer bg-red-700 text-white"
                  : isBlocked
                    ? "bg-red-200 text-red-800"
                    : isSelected
                      ? "bg-yellow-300 text-gray-900 ring-2 ring-yellow-500"
                      : "bg-green-100 text-green-800 hover:bg-green-200"
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
        <div className="-mt-2 mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center">
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
