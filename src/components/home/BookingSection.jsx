import { useState } from "react";
import { useTranslation } from "react-i18next";

function generateTimeSlots(start = "09:00", end = "17:30") {
  const slots = [];
  let [hour, minute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  while (hour < endHour || (hour === endHour && minute <= endMinute)) {
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    slots.push(timeStr);
    minute += 30;
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
  }

  return slots;
}

function BookingSection() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const allTimes = generateTimeSlots();
  const bookedTimes = ["10:30", "14:00"];
  const availableTimes = allTimes.filter(time => !bookedTimes.includes(time));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !phoneNumber || !selectedDate || !selectedTime || !selectedService) {
      alert(t("fill_required_fields"));
      return;
    }

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);

    setFullName("");
    setPhoneNumber("");
    setSelectedDate("");
    setSelectedTime("");
    setSelectedService("");
  };

  return (
    <section id="booking" className={`bg-[#f8f8f8] text-primary py-16 px-4 ${fontClass}`}>
      <div className="max-w-xl mx-auto">
        <h2 className="text-4xl font-bold mb-8 text-center text-gold">{t("book_now")}</h2>

        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100">
          {submitted && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-center">
              ✅ {t("thank_you")}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block mb-1 font-semibold text-gray-700">{t("name")}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-gray-700">{t("phone")}</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-gray-700">{t("select_date")}</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                required
              />
            </div>

            {selectedDate && (
              <div>
                <label className="block mb-2 font-semibold text-gray-700">{t("choose_time")}</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableTimes.map((time) => (
                    <button
                      type="button"
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-3 rounded-md text-sm font-medium border transition 
                      ${selectedTime === time
                          ? "bg-gold text-primary border-gold shadow"
                          : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gold hover:text-primary"}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block mb-2 font-semibold text-gray-700">{t("choose_service")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "haircut", label: t("service_haircut") },
                  { id: "beard", label: t("service_beard") },
                ].map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedService(service.id)}
                    className={`py-2 px-3 rounded-md font-medium border transition 
                      ${selectedService === service.id
                        ? "bg-gold text-primary border-gold shadow"
                        : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gold hover:text-primary"}`}
                  >
                    {service.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-gold text-primary py-3 rounded-xl font-bold hover:bg-darkText hover:text-light transition"
            >
              {t("confirm_booking")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default BookingSection;
