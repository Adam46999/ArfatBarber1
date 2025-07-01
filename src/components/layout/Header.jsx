// ✅ src/components/layout/Header.jsx (مُحدث لإخفاء قسم الخدمات مؤقتًا)
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { Link } from "react-router-dom";
import { useState } from "react";
import logo from "../../assets/arfatblacklogo.png";

function Header() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-tajawal" : "font-heading";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`bg-primary text-light shadow-md fixed top-0 left-0 w-full z-50 ${fontClass}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 text-2xl md:text-3xl font-notokufi font-bold tracking-tight text-gold">
          <img src={logo} alt="Arfat Barber Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-full" />
          Arfat Barber
        </Link>

        <nav className="hidden md:flex gap-x-10 items-center text-lg font-tajawal font-medium tracking-wide px-2">
          <Link to="/" className="hover:text-gold transition">{t("home")}</Link>
          {/* <a href="#services" className="hover:text-gold transition">{t("services")}</a> */}
          <Link to="/contact" className="hover:text-gold transition">{t("contact")}</Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/?scrollTo=booking"
            className="bg-gold text-primary font-tajawal font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-darkText hover:text-light transition-all duration-200"
          >
            {t("book_now")}
          </Link>
          <LanguageSwitcher />
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden focus:outline-none">
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-primary text-light px-6 pb-4 space-y-2 text-sm font-tajawal font-medium">
          <Link to="/" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("home")}</Link>
          <Link to="/about" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("about")}</Link>
          {/* <a href="#services" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("services")}</a> */}
          <Link to="/contact" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("contact")}</Link>
          <Link
            to="/?scrollTo=booking"
            className="block bg-gold text-primary text-center font-tajawal font-bold px-4 py-2 rounded-xl hover:bg-darkText hover:text-light transition"
            onClick={() => setMenuOpen(false)}
          >
            {t("book_now")}
          </Link>
          <div className="pt-2">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
