import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import AOS from "aos";
import "aos/dist/aos.css";

import "../../styles/heroEnhancements.css";

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HeroSection() {
  const { t } = useTranslation();

  const [heroNote, setHeroNote] = useState(null);
  const [noteClosed, setNoteClosed] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 700,
      once: true,
      offset: 0,
    });
  }, []);

  useEffect(() => {
    const ref = doc(db, "barberSettings", "general");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};

      setHeroNote(data.heroNote || null);
      setNoteClosed(false);
    });

    return () => unsubscribe();
  }, []);

  const smoothScrollTo = (id) => {
    const element = document.getElementById(id);

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const onCheckClick = (event) => {
    event.preventDefault();
    smoothScrollTo("check-booking");
  };

  const onBookClick = (event) => {
    event.preventDefault();

    const element = document.getElementById("booking-form-start");

    if (!element) return;

    const y = element.getBoundingClientRect().top + window.pageYOffset - 90;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  };

  const getNoteAppearance = () => {
    if (heroNote?.type === "important") {
      return {
        title: "تنبيه مهم",
        icon: "!",
        iconClass: "hero-note-icon hero-note-icon--important",
        titleClass: "hero-note-title hero-note-title--important",
      };
    }

    if (heroNote?.type === "offer") {
      return {
        title: "عرض مميز",
        icon: "%",
        iconClass: "hero-note-icon hero-note-icon--offer",
        titleClass: "hero-note-title hero-note-title--offer",
      };
    }

    return {
      title: "ملاحظة",
      icon: "i",
      iconClass: "hero-note-icon",
      titleClass: "hero-note-title",
    };
  };

  const noteAppearance = getNoteAppearance();

  return (
    <section className="hero-overlay">
      <img
        src="/barber-hero.jpg"
        alt="حلاق أثناء قص الشعر"
        className="hero-media"
        loading="eager"
        fetchPriority="high"
      />

      <div className="hero-content-shell">
        <div className="hero-content" data-aos="fade-up">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              {t("hero_eyebrow", {
                defaultValue: "قصّة مرتبة. تفاصيل أدق.",
              })}{" "}
            </p>

            <h1 className="hero-title">
              {t("hero_title") || "أسلوب يليق بك، بكل بساطة"}
            </h1>

            <p className="hero-subtitle">
              {t("hero_subtitle") || "نمنحك مظهرًا يناسبك ويعبّر عنك"}
            </p>
          </div>

          {heroNote?.enabled && heroNote?.text?.trim() && !noteClosed && (
            <div className="hero-note">
              <button
                type="button"
                onClick={() => setNoteClosed(true)}
                className="hero-note-close"
                aria-label="إغلاق الملاحظة"
                title="إغلاق"
              >
                ×
              </button>

              <div className="hero-note-inner">
                <div className={noteAppearance.iconClass} aria-hidden="true">
                  {noteAppearance.icon}
                </div>

                <div className="hero-note-copy">
                  <div className={noteAppearance.titleClass}>
                    {noteAppearance.title}
                  </div>

                  <div className="hero-note-text">{heroNote.text}</div>
                </div>
              </div>
            </div>
          )}

          <div className="hero-actions">
            <a
              href="#booking-form-start"
              onClick={onBookClick}
              className="hero-button hero-button--primary"
            >
              <CalendarIcon />
              <span>{t("book_now") || "احجز الآن"}</span>
            </a>

            <a
              href="#check-booking"
              onClick={onCheckClick}
              className="hero-button hero-button--secondary"
            >
              <SearchIcon />
              <span>{t("check_booking") || "تحقق من الحجز"}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="hero-bottom-fade" aria-hidden="true" />
    </section>
  );
}

export default HeroSection;
