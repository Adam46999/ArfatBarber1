import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { Link } from "react-router-dom";

function Header() {
  const { t } = useTranslation();

  return (
    <header className="w-full bg-primary text-light shadow-md fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-2xl font-heading tracking-wider text-gold">
          Arfat Barber
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex gap-6 items-center text-sm font-body">
          <Link to="/" className="hover:text-gold transition">{t("home")}</Link>
<Link to="/about" className="hover:text-gold transition">
  {t("about")}
</Link>
          <a href="#services" className="hover:text-gold transition">{t("services")}</a>
<Link to="/contact" className="hover:text-gold transition px-2 capitalize">
  {t("contact")}
</Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <Link
            to="/booking-form"
            className="hidden md:inline-block bg-gold text-primary font-semibold px-4 py-2 rounded hover:bg-darkText hover:text-light transition"
          >
            {t("book_now")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

export default Header;
