import { useTranslation } from "react-i18next";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok
} from "react-icons/fa";

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary text-light text-center p-6 text-sm font-body">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* النص */}
        <div>
          <p className="mb-1">
            © {new Date().getFullYear()} Arfat Barber. {t("all_rights")}
          </p>
          <p className="text-gold">{t("footer_note")}</p>
        </div>

        {/* أيقونات السوشيال */}
        <div className="flex justify-center gap-4 text-gold mt-4">
          <a
            href="https://www.instagram.com/arafat_barber/"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full hover:bg-gold hover:text-primary transition"
          >
            <FaInstagram size={18} />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full hover:bg-gold hover:text-primary transition"
          >
            <FaFacebook size={18} />
          </a>
          <a
            href="https://www.tiktok.com/@arfatbarber"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 flex items-center justify-center border-2 border-gold rounded-full hover:bg-gold hover:text-primary transition"
          >
            <FaTiktok size={18} />
          </a>
        </div>
      </div>
      <button
  onClick={() => window.location.href = "/barber"}
  className="fixed bottom-4 right-4 text-white text-xl z-50 hover:text-gold transition"
  title="دخول الحلاق"
>
  ✂️
</button>

    </footer>
  );
}

export default Footer;
