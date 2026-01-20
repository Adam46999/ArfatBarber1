// src/constants/barberDefaultWeeklyHours.js
// Default weekly hours (matches the screenshot concept).
// Note: we store as {from, to} where from < to to avoid confusion.
// Display will be Arabic-friendly "من ... إلى ...".

const barberDefaultWeeklyHours = {
  Sunday: null, // مغلق طوال اليوم

  // الإثنين - الأربعاء: 12:00 → 20:00
  Monday: { from: "12:00", to: "20:00" },
  Tuesday: { from: "12:00", to: "20:00" },
  Wednesday: { from: "12:00", to: "20:00" },

  // الخميس: 12:00 → 22:00
  Thursday: { from: "12:00", to: "22:00" },

  // الجمعة: 13:30 → 22:00
  Friday: { from: "13:30", to: "22:00" },

  // السبت: 11:00 → 19:30
  Saturday: { from: "11:00", to: "19:30" },
};

export default barberDefaultWeeklyHours;
