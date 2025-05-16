import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function BookingIntro() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-heading";

  const workingHours = [
    { day: 'Sunday', hours: 'Closed' },
    { day: 'Monday', hours: 'Closed' },
    { day: 'Tuesday', hours: '12:00 – 21:00' },
    { day: 'Wednesday', hours: '12:00 – 21:00' },
    { day: 'Thursday', hours: '12:00 – 22:00' },
    { day: 'Friday', hours: '13:00 – 23:30' },
    { day: 'Saturday', hours: '11:00 – 19:30' },
  ];

  return (
    <section className={`min-h-screen bg-primary text-light ${fontClass} flex flex-col items-center justify-start pt-24 px-4`}>
      {/* صورة الحلاق والعنوان */}
      <div className="text-center" data-aos="fade-up">
        <img
          src="/barber.jpg"
          alt="Arfat Barber"
          className="w-48 h-48 rounded-full object-cover shadow-md mx-auto"
        />
        <h1 className="text-3xl mt-4 text-gold">Arfat Barber</h1>
        <p className="text-sm text-gray-400">Professional Grooming Experience</p>
      </div>

      {/* ساعات العمل */}
      <div className="mt-10 w-full max-w-md" data-aos="fade-up" data-aos-delay="100">
        <h2 className="text-xl font-semibold mb-4 text-center text-gold">{t('working_hours')}</h2>
        <ul className="bg-white text-darkText rounded-lg shadow-md divide-y divide-gray-200">
          {workingHours.map(({ day, hours }) => (
            <li key={day} className="flex justify-between p-3 px-5">
              <span>{t(day)}</span>
              <span className={hours === 'Closed' ? 'text-red-500' : ''}>{hours}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* زر ابدأ الحجز */}
      <div className="mt-10" data-aos="zoom-in" data-aos-delay="400">
        <Link
          to="/booking-form"
          className="bg-gold text-primary px-6 py-3 rounded-full font-semibold 
                     transition-all duration-300 shadow-sm 
                     hover:bg-darkText hover:text-light 
                     hover:shadow-lg hover:scale-105"
        >
          {t("start_booking") || "Start Booking"}
        </Link>
      </div>
    </section>
  );
}

export default BookingIntro;
