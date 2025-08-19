function TimeSlots({ availableTimes, selectedTime, onSelect }) {
  if (availableTimes.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {availableTimes.map((time) => (
        <button
          key={time}
          type="button"
          onClick={() => onSelect(time)}
          className={`p-2 border rounded-md text-sm font-semibold transition duration-200 ${
            selectedTime === time
              ? "bg-primary text-light"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          {time}
        </button>
      ))}
    </div>
  );
}

export default TimeSlots;
