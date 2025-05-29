import { useTranslation } from "react-i18next";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaPhone,
} from "react-icons/fa";
import { SiWaze } from "react-icons/si";

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary text-light pt-16 pb-8 px-6 text-sm font-body relative">
      <div className="max-w-7xl mx-auto text-center space-y-6">
        {/* عنوان تواصل معنا */}
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gold">
          {t("contact") || "تواصل معنا"}
        </h2>

        {/* الموقع ورقم الهاتف */}
        <div className="space-y-2 text-gold text-lg font-semibold">
          <a
            href="https://waze.com/ul?ll=32.93047,35.27657&navigate=yes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-center items-center gap-2 hover:text-white transition"
          >
            <SiWaze size={20} />
            {t("address") || "البعنة - شارع غدارة"}
          </a>

          <a
            href="tel:+972549896985"
            className="flex justify-center items-center gap-2 hover:text-white transition"
          >
            <FaPhone size={18} />
            +972 54-989-6985
          </a>
        </div>

        {/* أيقونات السوشيال */}
        <div className="flex justify-center gap-4 mt-4">
          <a
            href="https://www.instagram.com/arafat_barber/"
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 flex items-center justify-center border-2 border-gold rounded-full text-gold hover:bg-gold hover:text-primary transition"
          >
            <FaInstagram size={20} />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 flex items-center justify-center border-2 border-gold rounded-full text-gold hover:bg-gold hover:text-primary transition"
          >
            <FaFacebook size={20} />
          </a>
          <a
            href="https://www.tiktok.com/@arfatbarber"
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 flex items-center justify-center border-2 border-gold rounded-full text-gold hover:bg-gold hover:text-primary transition"
          >
            <FaTiktok size={20} />
          </a>
        </div>

        {/* الحقوق */}
        <div className="text-center text-sm mt-6 space-y-1 text-light">
          <p>© 2025 Arfat Barber. {t("all_rights")}</p>
          <p>{t("footer_note")}</p>
        </div>
      </div>

      {/* رابط صفحة الحلاق - ثابت أسفل اليسار */}
      <a
        href="/barber"
        className="absolute bottom-2 left-6 text-gold text-lg font-heading font-bold hover:text-white transition"
        title="دخول صفحة الحلاق"
      >
        Arfat Barber
      </a>
    </footer>
  );
}

export default Footer;
