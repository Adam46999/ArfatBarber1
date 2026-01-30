// ✅ src/components/layout/Header.jsx — Polish بصري (2+3+4+5+6) بدون كسر المنطق
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
  const headerRef = useRef(null);

  // أغلق القائمة عند تغيّر المسار
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // ✅ خزّن ارتفاع الهيدر كـ CSS variable عشان أي sticky تحت الهيدر يشتغل صح
  useEffect(() => {
    const applyHeaderHeight = () => {
      const h = headerRef.current?.offsetHeight || 72;
      document.documentElement.style.setProperty("--app-header-h", `${h}px`);
    };

    applyHeaderHeight();
    window.addEventListener("resize", applyHeaderHeight);

    return () => window.removeEventListener("resize", applyHeaderHeight);
  }, [i18n.language]);

  // قفل تمرير الصفحة + Esc + ضغط خارج القائمة
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;

    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prevOverflow || "";

    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

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
    `transition-colors duration-200 hover:text-gold ${
      location.pathname === to ? "text-gold font-semibold" : "text-light/90"
    }`;

  return (
    <header
      ref={headerRef}
      className={`bg-primary text-light shadow-md fixed top-0 left-0 w-full z-50 ${fontClass}`}
      role="banner"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-gold text-primary px-3 py-2 rounded-md"
      >
        {isArabic ? "تخطَّ إلى المحتوى" : "Skip to content"}
      </a>

      {/* ✅ ارتفاع أنظف + محاذاة Premium */}
      <div className="max-w-7xl mx-auto px-6 h-[64px] flex items-center justify-between relative">
        {/* الشعار */}
        <Link
          to="/"
          className="flex items-center gap-3 text-gold select-none"
          aria-label="Arfat Barber - Home"
        >
          {/* (6) Glow subtle على اللوجو */}
          <span className="relative">
            <img
              src={logo}
              alt="Arfat Barber Logo"
              className="w-10 h-10 md:w-11 md:h-11 object-contain rounded-full shadow-[0_0_0_2px_rgba(255,215,0,0.12),0_6px_18px_rgba(0,0,0,0.25)]"
              loading="eager"
              fetchPriority="high"
            />
          </span>

          {/* (3) Brand typographic polish */}
          <span className="leading-none">
            <span className="block text-[18px] md:text-[20px] font-black tracking-tight">
              Arafat
            </span>
            <span className="block -mt-0.5 text-[13px] md:text-[14px] font-semibold tracking-wide text-gold/80">
              Barber
            </span>
          </span>
        </Link>

        {/* روابط سطح المكتب */}
        <nav
          className="hidden md:flex gap-x-10 items-center text-[16px] font-tajawal font-medium tracking-wide"
          aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}
        >
          <Link to="/" className={linkClass("/")}>
            {t("home")}
          </Link>

          <Link to="/contact" className={linkClass("/contact")}>
            {t("contact")}
          </Link>
        </nav>

        {/* يمين سطح المكتب: احجز الآن + اللغات */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/?scrollTo=booking"
            className="bg-gold text-primary font-tajawal font-black px-4 py-2 rounded-xl shadow-sm hover:bg-darkText hover:text-light transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold"
          >
            {t("book_now")}
          </Link>

          {/* (5) فاصل خفيف */}
          <span className="w-px h-7 bg-white/10 mx-1" aria-hidden="true" />

          {/* (2) تهدئة شكل اللغة (Wrapper) */}
          <div className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-2 py-1">
            <LanguageSwitcher />
          </div>
        </div>

        {/* يمين الموبايل: اللغات + زر القائمة */}
        <div className="md:hidden flex items-center gap-2">
          {/* (2) تهدئة شكل اللغة (Wrapper) */}
          <div className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-2 py-1">
            <LanguageSwitcher />
          </div>

          {/* (5) فاصل خفيف */}
          <span className="w-px h-7 bg-white/10 mx-1" aria-hidden="true" />

          {/* (4) Hamburger كزر Modern */}
          <button
            ref={buttonRef}
            onClick={() => setMenuOpen((v) => !v)}
            className="focus:outline-none rounded-xl w-10 h-10 grid place-items-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
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
                className={`absolute left-0 top-1 w-6 h-0.5 bg-light transition-transform duration-200 ${
                  menuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-2.5 w-6 h-0.5 bg-light transition-opacity duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-4 w-6 h-0.5 bg-light transition-transform duration-200 ${
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
          className="block mt-2 bg-gold text-primary text-center font-tajawal font-black px-4 py-2 rounded-xl hover:bg-darkText hover:text-light transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold"
          onClick={() => setMenuOpen(false)}
        >
          {t("book_now")}
        </Link>
      </div>
    </header>
  );
}

export default Header;
