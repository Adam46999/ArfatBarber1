import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function DateSelector({ selectedDate, onChange, placeholder }) {
  return (
    <DatePicker
      selected={selectedDate}
      onChange={onChange}
      dateFormat="yyyy-MM-dd"
      minDate={new Date()}
      className="w-full border border-gray-300 p-3 rounded-md"
      calendarClassName="z-50"       // ✅ هذا هو السطر اللي أضفناه
      placeholderText={placeholder}
      required
    />
  );
}

export default DateSelector;
