// src/components/booking/DateSelector.jsx
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function DateSelector({ selectedDate, onChange, placeholder }) {
  return (
    <DatePicker
      selected={selectedDate}
      onChange={onChange}
      dateFormat="yyyy-MM-dd"
      minDate={new Date()}                  /* يمنع أي تاريخ قبل اليوم */
      filterDate={(date) => date.getDay() !== 0}  /* يمنع أيام الأحد */
      className="w-full border border-gray-300 p-3 rounded-md"
      calendarClassName="z-50"
      placeholderText={placeholder}
      required
    />
  );
}

export default DateSelector;
