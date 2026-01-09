// src/pages/barberPanel/components/TimesGrid.jsx
export default function TimesGrid({
  times,
  selectedDate,
  bookings,
  blockedTimes,
  selectedTimes,
  onToggleTime,
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
      {times.map((time) => {
        const booked = bookings.some(
          (b) =>
            b.selectedDate === selectedDate &&
            b.selectedTime === time &&
            !b.cancelledAt
        );

        const isBlocked = blockedTimes.includes(time);
        const isSelected = selectedTimes.includes(time);

        return (
          <button
            key={time}
            onClick={() => onToggleTime(time)}
            disabled={booked}
            className={`py-2 rounded-xl text-sm font-medium text-center transition-all duration-200 ${
              booked
                ? "bg-red-700 text-white cursor-not-allowed"
                : isBlocked
                ? "bg-red-200 text-red-800"
                : isSelected
                ? "bg-yellow-300 text-gray-900 ring-2 ring-yellow-500"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
            title={
              booked
                ? "هذه الساعة محجوزة"
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
  );
}
