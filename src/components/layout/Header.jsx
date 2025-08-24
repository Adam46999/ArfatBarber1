// ✅ src/components/layout/Header.jsx — UX ممتاز + اللغات ظاهرة دائمًا
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import logo from "../../assets/arfatblacklogo.png";

function Header() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-tajawal" : "font-heading";

  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // أغلق القائمة عند تغيّر المسار
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // قفل تمرير الصفحة + Esc + ضغط خارج القائمة
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prevOverflow || "";

    const onKeyDown = (e) => e.key === "Escape" && setMenuOpen(false);
    const onClickOutside = (e) => {
      if (!menuRef.current) return;
      const isInsideMenu = menuRef.current.contains(e.target);
      const isOnButton = buttonRef.current?.contains(e.target);
      if (menuOpen && !isInsideMenu && !isOnButton) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickOutside);
      document.body.style.overflow = prevOverflow || "";
    };
  }, [menuOpen]);

  const linkClass = (to) =>
    `hover:text-gold transition ${
      location.pathname === to ? "text-gold font-semibold" : ""
    }`;

  return (
    <header
      className={`bg-primary text-light shadow-md fixed top-0 left-0 w-full z-50 ${fontClass}`}
      role="banner"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-gold text-primary px-3 py-2 rounded-md"
      >
        {isArabic ? "تخطَّ إلى المحتوى" : "Skip to content"}
      </a>

      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
        {/* الشعار */}
        <Link
          to="/"
          className="flex items-center gap-3 text-2xl md:text-3xl font-notokufi font-bold tracking-tight text-gold"
          aria-label="Arfat Barber - Home"
        >
          <img
            src={logo}
            alt="Arfat Barber Logo"
            className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-full"
            loading="eager"
            fetchpriority="high"
          />
          Arfat Barber
        </Link>

        {/* روابط سطح المكتب */}
        <nav
          className="hidden md:flex gap-x-10 items-center text-lg font-tajawal font-medium tracking-wide px-2"
          aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}
        >
          <Link to="/" className={linkClass("/")}>
            {t("home")}
          </Link>
          {/* <a href="#services" className="hover:text-gold transition">{t("services")}</a> */}
          <Link to="/contact" className={linkClass("/contact")}>
            {t("contact")}
          </Link>
        </nav>

        {/* يمين سطح المكتب: احجز الآن + اللغات */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/?scrollTo=booking"
            className="bg-gold text-primary font-tajawal font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-darkText hover:text-light transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold"
          >
            {t("book_now")}
          </Link>
          <LanguageSwitcher />
        </div>

        {/* يمين الموبايل: اللغات ظاهرة دائمًا + زر القائمة */}
        <div className="md:hidden flex items-center gap-3">
          <LanguageSwitcher />
          {/* ← تبقى ظاهرة حتى لو القائمة مسكّرة */}
          <button
            ref={buttonRef}
            onClick={() => setMenuOpen((v) => !v)}
            className="focus:outline-none rounded-md p-2"
            aria-label={
              menuOpen
                ? isArabic
                  ? "إغلاق القائمة"
                  : "Close menu"
                : isArabic
                ? "فتح القائمة"
                : "Open menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">{menuOpen ? "Close" : "Open"}</span>
            <div className="w-6 h-6 relative" aria-hidden="true">
              <span
                className={`absolute left-0 top-1 w-6 h-0.5 bg-light transition-transform ${
                  menuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-2.5 w-6 h-0.5 bg-light transition-opacity ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-4 w-6 h-0.5 bg-light transition-transform ${
                  menuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* قائمة الموبايل — absolute تحت الهيدر، بلا فراغ عند الإغلاق */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`md:hidden absolute left-0 top-full w-full bg-primary text-light px-6 pb-4 text-sm font-tajawal font-medium origin-top transition-[opacity,transform] duration-200 ${
          menuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none select-none"
        }`}
      >
        <Link
          to="/"
          className="block py-2 hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
          onClick={() => setMenuOpen(false)}
          aria-current={location.pathname === "/" ? "page" : undefined}
        >
          {t("home")}
        </Link>

        <Link
          to="/about"
          className="block py-2 hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
          onClick={() => setMenuOpen(false)}
          aria-current={location.pathname === "/about" ? "page" : undefined}
        >
          {t("about")}
        </Link>

        {/* <a href="#services" className="block hover:text-gold" onClick={() => setMenuOpen(false)}>{t("services")}</a> */}

        <Link
          to="/contact"
          className="block py-2 hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
          onClick={() => setMenuOpen(false)}
          aria-current={location.pathname === "/contact" ? "page" : undefined}
        >
          {t("contact")}
        </Link>

        <Link
          to="/?scrollTo=booking"
          className="block mt-2 bg-gold text-primary text-center font-tajawal font-bold px-4 py-2 rounded-xl hover:bg-darkText hover:text-light transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold"
          onClick={() => setMenuOpen(false)}
        >
          {t("book_now")}
        </Link>
      </div>
    </header>
  );
}

export default Header;
