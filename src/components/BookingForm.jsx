import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTranslation } from "react-i18next";

const workingHours = {
  Sunday: null,
  Monday: null,
  Tuesday: { from: "12:00", to: "21:00" },
  Wednesday: { from: "12:00", to: "21:00" },
  Thursday: { from: "12:00", to: "22:00" },
  Friday: { from: "13:00", to: "23:30" },
  Saturday: { from: "11:00", to: "19:30" },
};

const generateTimeSlots = (from, to) => {
  const slots = [];
  const [fromHour, fromMinute] = from.split(":").map(Number);
  const [toHour, toMinute] = to.split(":").map(Number);

  let current = new Date();
  current.setHours(fromHour, fromMinute, 0, 0);

  const end = new Date();
  end.setHours(toHour, toMinute, 0, 0);

  while (current <= end) {
    const time = current.toTimeString().slice(0, 5);
    slots.push(time);
    current.setMinutes(current.getMinutes() + 60);
  }

  return slots;
};

function BookingForm() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: null,
    time: "",
    service: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);

  useEffect(() => {
    if (!form.date) {
      setAvailableTimes([]);
      return;
    }

    const day = form.date.toLocaleDateString("en-US", { weekday: "long" });
    const hours = workingHours[day];

    if (!hours) {
      setAvailableTimes([]);
    } else {
      setAvailableTimes(generateTimeSlots(hours.from, hours.to));
    }
  }, [form.date]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Booking Submitted:", form);
    setSubmitted(true);
  };

  return (
<section className={`min-h-screen bg-[#1e1e1e] text-light ${fontClass} flex items-center justify-center py-16 px-4`}>
      <div
        className="w-full max-w-xl p-8 bg-white text-darkText rounded-lg shadow-lg"
        data-aos="fade-up"
        data-aos-duration="1000"
      >
        <h2 className="text-3xl font-heading font-bold mb-6 text-center text-gold">
          {t("book_now") || "Book Your Appointment"}
        </h2>

        {submitted ? (
          <p className="text-green-600 text-center text-xl font-semibold">
            ✅ {t("thank_you") || "Thank you! Your appointment has been received."}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 font-body">
            <input
              type="text"
              name="name"
              placeholder={t("name") || "Full Name"}
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-3 rounded-md"
            />

            <input
              type="tel"
              name="phone"
              placeholder={t("phone") || "Phone Number"}
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-3 rounded-md"
            />

            <DatePicker
              selected={form.date}
              onChange={(date) => setForm({ ...form, date, time: "" })}
              dateFormat="yyyy-MM-dd"
              minDate={new Date()}
              className="w-full border border-gray-300 p-3 rounded-md"
              placeholderText={t("select_date") || "Select a date"}
              required
            />

            {form.date && availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map((time) => (
                  <button
                    type="button"
                    key={time}
                    onClick={() => setForm({ ...form, time })}
                    className={`p-2 border rounded-md text-sm font-semibold transition duration-200 ${
                      form.time === time
                        ? "bg-primary text-light"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : form.date ? (
              <p className="text-red-500 text-sm">
                ❌ {t("no_hours") || "No available hours for this day (Closed)."}
              </p>
            ) : null}

            <select
              name="service"
              value={form.service}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-3 rounded-md"
            >
              <option value="">{t("choose_service") || "Choose a Service"}</option>
              <option value="Haircut">{t("service_haircut") || "Haircut"}</option>
              <option value="Beard Trim">{t("service_beard") || "Beard Trim"}</option>
              <option value="Haircut & Beard">{t("service_combo") || "Haircut & Beard"}</option>
            </select>

            <button
              type="submit"
              className="w-full bg-gold text-primary py-3 rounded-md font-semibold hover:bg-darkText hover:text-light transition"
              disabled={!form.time}
            >
              {t("confirm_booking") || "Confirm Booking"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default BookingForm;
