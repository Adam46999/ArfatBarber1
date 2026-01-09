// src/pages/barberPanel/components/DateDropdown.jsx
import { useEffect, useState } from "react";

export default function DateDropdown({ selectedDate, onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const temp = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const daysAr = [
        "الأحد",
        "الإثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ];
      let label = daysAr[d.getDay()];
      if (d.toDateString() === today.toDateString()) label += " (اليوم)";
      else if (d.toDateString() === tomorrow.toDateString()) label += " (بكرا)";

      temp.push({ value: iso, label });
    }

    setOptions(temp);
  }, []);

  return (
    <select
      value={selectedDate}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gold transition mb-4"
    >
      <option value="" disabled>
        اختر التاريخ من القائمة
      </option>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
