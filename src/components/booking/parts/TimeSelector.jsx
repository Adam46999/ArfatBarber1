// src/components/booking/TimeSelector.jsx
export default function TimeSelector({
  selectedDate,
  selectedTime,
  onSelectTime,
  availableTimes,
  workingHours,
  t,
}) {
  if (!selectedDate) return null;

  const [yyyy, mm, dd] = selectedDate.split("-");
  const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const hours = workingHours[weekday];

  if (!hours) {
    return <p className="text-red-500">{t("closed_day")}</p>;
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
      {availableTimes.map((time) => {
        const isSelected = selectedTime === time;
        return (
          <button
            key={time}
            type="button"
            onClick={() => onSelectTime(time)}
            className={`py-2 px-3 rounded-md text-sm font-medium border transition
              ${
                isSelected
                  ? "bg-gold text-primary border-gold shadow"
                  : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gold hover:text-primary"
              }`}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}
