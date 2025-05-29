import { useTranslation } from "react-i18next";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaPhone,
} from "react-icons/fa";
import { SiWaze } from "react-icons/si"; // ✅ أيقونة Waze

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary text-light text-center px-6 py-12 font-body">
      <div className="max-w-7xl mx-auto space-y-6">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-gold">
          {t("contact") || "Contact Us"}
        </h2>

        {/* ✅ الموقع مع رابط Waze */}
        <a
          href="https://waze.com/ul?ll=32.93047,35.27657&navigate=yes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-gold hover:text-white transition text-lg"
        >
          <SiWaze size={22} className="text-gold" />
          {t("address") || "Ba'aneh - Ghaddara Street"}
        </a>

        {/* ✅ رقم الهاتف */}
        <a
          href="tel:+972549896985"
          className="flex items-center justify-center gap-2 text-gold hover:text-white transition text-lg"
        >
          <FaPhone size={20} />
          +972 54-989-6985
        </a>

        {/* ✅ أيقونات السوشيال ميديا */}
        <div className="flex justify-center gap-4">
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

        {/* الحقوق */}
        <div className="text-xs text-gray-400 mt-6">
          <p>
            © {new Date().getFullYear()} Arfat Barber. {t("all_rights")}
          </p>
          <p className="text-gold">{t("footer_note")}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;