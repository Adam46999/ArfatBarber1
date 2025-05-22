import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaPhone,
} from "react-icons/fa";
import { SiWaze } from "react-icons/si"; // ✅ أيقونة Waze
import AOS from "aos";
import "aos/dist/aos.css";

function ContactSection() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "he";
  const fontClass = isRTL ? "font-ar" : "font-body";

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true, // ✅ مهم لظهور العناصر دائمًا حتى بدون scroll
    });
  }, []);

  return (
    <section className={`py-20 px-6 md:px-20 bg-primary text-white text-center ${fontClass}`}>
      <h2
        className="text-3xl md:text-4xl font-heading font-bold mb-6 text-gold"
        data-aos="fade-up"
      >
        {t("contact") || "Contact Us"}
      </h2>

      {/* ✅ الموقع مع رابط Waze */}
      <a
        href="https://waze.com/ul?ll=32.93047,35.27657&navigate=yes"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-gold hover:text-white transition text-lg mb-2"
        data-aos="fade-up"
      >
        <SiWaze size={22} className="text-gold" />
        {t("address") || "Ba'aneh - Ghaddara Street"}
      </a>

      {/* ✅ رقم الهاتف */}
      <a
        href="tel:+972549896985"
        className="flex items-center justify-center gap-2 text-gold hover:text-white transition text-lg mb-6"
        data-aos="fade-up"
        data-aos-delay="100"
      >
        <FaPhone size={20} />
        +972 54-989-6985
      </a>

      {/* ✅ أيقونات السوشيال ميديا */}
      <div
        className="flex justify-center gap-4"
        data-aos="fade-up"
        data-aos-delay="200"
      >
        <a
          href="https://www.instagram.com/arafat_barber/"
          target="_blank"
          rel="noreferrer"
          className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full text-gold hover:bg-gold hover:text-primary transition"
        >
          <FaInstagram size={20} />
        </a>
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noreferrer"
          className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full text-gold hover:bg-gold hover:text-primary transition"
        >
          <FaFacebook size={20} />
        </a>
        <a
          href="https://www.tiktok.com/@arfatbarber"
          target="_blank"
          rel="noreferrer"
          className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full text-gold hover:bg-gold hover:text-primary transition"
        >
          <FaTiktok size={20} />
        </a>
      </div>
    </section>
  );
}

export default ContactSection;
