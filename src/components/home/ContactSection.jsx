import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from "react-router-dom";

function ContactSection() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <section className="py-20 px-6 md:px-20 bg-primary text-white text-center font-body">
      <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-gold" data-aos="fade-up">
        {t("contact") || "Contact Us"}
      </h2>

      <p className="mb-2" data-aos="fade-up" data-aos-delay="100">📍 123 Barber Street, City</p>
      <p className="mb-2" data-aos="fade-up" data-aos-delay="200">📞 +123 456 7890</p>
      <p className="mb-6" data-aos="fade-up" data-aos-delay="300">✉️ info@arfatbarber.com</p>

      <Link
        to="/booking-form"
        className="inline-block bg-gold hover:bg-yellow-400 text-primary font-semibold px-6 py-3 rounded shadow-md transition"
        data-aos="zoom-in"
      >
        {t("start_booking") || "Start Booking"}
      </Link>
    </section>
  );
}

export default ContactSection;
