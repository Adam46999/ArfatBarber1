// src/components/booking/parts/DateField.jsx
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function DateField({ valueYMD, onChangeYMD, t }) {
  // حوّل التاريخ النصي "yyyy-mm-dd" إلى كائن Date
  const selectedDate = valueYMD
    ? new Date(
        Number(valueYMD.split("-")[0]),
        Number(valueYMD.split("-")[1]) - 1,
        Number(valueYMD.split("-")[2])
      )
    : null;

  return (
    <DatePicker
      selected={selectedDate}
      onChange={(date) => {
        if (date) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const d = String(date.getDate()).padStart(2, "0");
          onChangeYMD(`${y}-${m}-${d}`);
        } else {
          onChangeYMD("");
        }
      }}
      dateFormat="yyyy-MM-dd"
      minDate={new Date()}
      filterDate={(date) => date.getDay() !== 0} // إلغاء أيام الأحد
      className="w-full border border-gray-300 p-3 rounded-xl focus:border-gold focus:ring-2 focus:ring-gold/40 transition"
      placeholderText={t("choose_date")}
      calendarClassName="z-50"
      required
    />
  );
}

export default DateField;
