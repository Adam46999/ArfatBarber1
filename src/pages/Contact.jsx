import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaWhatsapp, FaPhone, FaEnvelope, FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";
import AOS from "aos";
import "aos/dist/aos.css";

function Contact() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <section className="min-h-screen bg-don text-light px-6 py-20 font-body">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-heading text-gold mb-8" data-aos="fade-up">
          {t("contact") || "Contact Us"}
        </h1>

        {/* Google Map */}
        <div data-aos="fade-up" className="mb-10 rounded-xl overflow-hidden shadow-lg">
          <iframe
            title="Location"
            src="https://www.google.com/maps/embed?pb=!1m18!..." // 🔁 ضع هنا الرابط الدقيق
            width="100%"
            height="350"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            className="rounded-xl"
          ></iframe>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-6 mb-12" data-aos="fade-up" data-aos-delay="200">
          <a
            href="https://wa.me/9725XXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <FaWhatsapp /> WhatsApp
          </a>
          <a
            href="tel:+9725XXXXXXXX"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <FaPhone /> {t("call") || "Call"}
          </a>
          <a
            href="mailto:info@arfatbarber.com"
            className="bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <FaEnvelope /> Email
          </a>
        </div>

        {/* Social Media */}
        <div className="flex justify-center gap-6 text-2xl text-gold" data-aos="fade-up" data-aos-delay="300">
          <a href="https://www.instagram.com/arafat_barber/" target="_blank" rel="noreferrer" className="hover:text-white transition">
            <FaInstagram />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition">
            <FaFacebook />
          </a>
          <a href="https://www.tiktok.com/@arfatbarber?_t=ZS-8wPoMn00kvX&_r=1" target="_blank" rel="noreferrer" className="hover:text-white transition">
            <FaTiktok />
          </a>
        </div>
      </div>
    </section>
  );
}

export default Contact;
