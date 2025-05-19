import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { Link } from "react-router-dom";
import { useState } from "react";

function Header() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-heading";

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`bg-primary text-light shadow-md fixed top-0 left-0 w-full z-50 ${fontClass}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-2xl md:text-3xl font-bold tracking-wide text-gold">
          Arfat Barber
        </Link>

        {/* Desktop Navigation */}
<nav className="hidden md:flex gap-x-10 items-center text-lg font-heading tracking-wide px-2">
          <Link to="/" className="hover:text-gold transition">{t("home")}</Link>
          <Link to="/about" className="hover:text-gold transition">{t("about")}</Link>
          <a href="#services" className="hover:text-gold transition">{t("services")}</a>
          <Link to="/contact" className="hover:text-gold transition">{t("contact")}</Link>
        </nav>

        {/* Right side: Book + Language */}
        <div className="hidden md:flex items-center gap-4">
          <a
  href="#booking"
  className="bg-gold text-primary font-semibold px-4 py-2 rounded hover:bg-darkText hover:text-light transition"
>
  {t("book_now")}
</a>

          <LanguageSwitcher />
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden focus:outline-none">
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-primary text-light px-6 pb-4 space-y-2 text-sm font-body">
          <Link to="/" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("home")}</Link>
          <Link to="/about" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("about")}</Link>
          <a href="#services" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("services")}</a>
          <Link to="/contact" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("contact")}</Link>
          <Link
            to="/booking-form"
            className="block bg-gold text-primary text-center font-semibold px-4 py-2 rounded hover:bg-darkText hover:text-light transition"
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
