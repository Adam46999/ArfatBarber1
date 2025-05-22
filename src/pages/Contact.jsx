import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaWhatsapp,
  FaPhone,
  FaEnvelope,
  FaInstagram,
  FaFacebook,
  FaTiktok,
} from "react-icons/fa";
import AOS from "aos";
import "aos/dist/aos.css";

function Contact() {
  const { t } = useTranslation();

 useEffect(() => {
  AOS.init({
    duration: 1000,
    once: true,
  });
}, []);


  return (
    <section className="min-h-screen bg-primary text-light px-6 py-20 font-body">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-heading text-gold mb-8" data-aos="fade-up">
          {t("contact") || "Contact Us"}
        </h1>

        {/* الخريطة */}
        <div data-aos="fade-up" className="mb-10 rounded-xl overflow-hidden shadow-xl">
          <iframe
            title="Location"
            src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3392.888281731437!2d35.27657307554316!3d32.930468874419614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d3c2b896e621d%3A0x6162a13ac8997f60!2zMzLCsDU1JzQ5LjciTiAzNcKwMTYnMzUuNyJF!5e0!3m2!1sen!2sil!4v1716391693450!5m2!1sen!2sil"
            width="100%"
            height="350"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            className="rounded-xl"
          ></iframe>
        </div>

        {/* أزرار تواصل مباشرة */}
        <div className="grid md:grid-cols-3 gap-6 mb-12" data-aos="fade-up" data-aos-delay="100">
          <a
            href="https://wa.me/972549896985"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gold text-primary hover:bg-darkText hover:text-light py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow"
          >
            <FaWhatsapp /> WhatsApp
          </a>
          <a
            href="tel:+972549896985"
            className="bg-gold text-primary hover:bg-darkText hover:text-light py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow"
          >
            <FaPhone /> {t("call") || "Call"}
          </a>
          <a
            href="mailto:info@arfatbarber.com"
            className="bg-gold text-primary hover:bg-darkText hover:text-light py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow"
          >
            <FaEnvelope /> {t("email") || "Email"}
          </a>
        </div>

        {/* سوشيال ميديا */}
        <div
          className="flex justify-center gap-4 text-gold"
          data-aos="fade-up"
          data-aos-delay="200"
        >
          <a
            href="https://www.instagram.com/arafat_barber/"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full hover:bg-gold hover:text-primary transition"
          >
            <FaInstagram size={20} />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full hover:bg-gold hover:text-primary transition"
          >
            <FaFacebook size={20} />
          </a>
          <a
            href="https://www.tiktok.com/@arfatbarber"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full hover:bg-gold hover:text-primary transition"
          >
            <FaTiktok size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}

export default Contact;
