import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import AOS from "aos";
import "aos/dist/aos.css";

import "../../styles/heroEnhancements.css";

function HeroSection() {
  const { t } = useTranslation();

  const [heroNote, setHeroNote] = useState(null);
  const [noteClosed, setNoteClosed] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 1000 });
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

    if (!element) {
      return;
    }

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

    if (!element) {
      return;
    }

    const y = element.getBoundingClientRect().top + window.pageYOffset - 100;

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
        iconClass: "border-rose-300/60 bg-rose-100/80 text-rose-700",
        titleClass: "text-rose-700",
      };
    }

    if (heroNote?.type === "offer") {
      return {
        title: "عرض مميز",
        icon: "%",
        iconClass: "border-emerald-300/60 bg-emerald-100/80 text-emerald-700",
        titleClass: "text-emerald-700",
      };
    }

    return {
      title: "ملاحظة",
      icon: "i",
      iconClass: "border-amber-300/60 bg-amber-100/80 text-amber-700",
      titleClass: "text-amber-700",
    };
  };

  const noteAppearance = getNoteAppearance();

  return (
    <section className="hero-overlay relative flex h-screen min-h-[100svh] w-full items-center justify-center overflow-hidden">
      <img
        src="/barber-hero.jpg"
        alt="Barber Hero"
        className="hero-media absolute inset-0 z-0 h-full w-full object-cover object-center"
        loading="eager"
      />

      <div
        className="hero-content max-w-2xl px-4 text-center"
        data-aos="fade-up"
      >
        <h1
          className="mb-4 font-notokufi text-4xl font-extrabold leading-tight tracking-tight text-gold sm:text-5xl md:text-6xl"
          style={{
            textShadow:
              "0 2px 6px rgba(0,0,0,0.85), 0 6px 24px rgba(0,0,0,0.6)",
          }}
        >
          {t("hero_title") || "أسلوب يليق بك، بكل بساطة"}
        </h1>

        <p className="mx-auto mb-6 max-w-xl font-tajawal text-base leading-relaxed text-beige sm:text-lg md:text-xl">
          {t("hero_subtitle") || "لمحة مُظهرك، يناسبك ويعبر عنك"}
        </p>

        {heroNote?.enabled && heroNote?.text?.trim() && !noteClosed && (
          <div className="relative mx-auto mb-6 max-w-lg rounded-xl border border-gold/35 bg-white/78 px-4 py-3 text-right shadow-[0_8px_30px_rgba(0,0,0,0.14)] backdrop-blur-md sm:px-5">
            <button
              type="button"
              onClick={() => setNoteClosed(true)}
              className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-black/5 bg-white/50 text-lg leading-none text-gray-500 transition hover:bg-white/80 hover:text-gray-800"
              aria-label="إغلاق الملاحظة"
              title="إغلاق"
            >
              ×
            </button>

            <div className="flex items-start gap-3 pl-8">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black shadow-sm ${noteAppearance.iconClass}`}
                aria-hidden="true"
              >
                {noteAppearance.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-[11px] font-black tracking-wide ${noteAppearance.titleClass}`}
                >
                  {noteAppearance.title}
                </div>

                <div className="mt-1 text-sm font-extrabold leading-6 text-white drop-shadow-sm sm:text-[15px]">
                  {" "}
                  {heroNote.text}
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <a
            href="#booking-form-start"
            onClick={onBookClick}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gold px-7 py-3.5 font-semibold text-primary shadow-md transition hover:bg-yellow-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            {t("book_now") || "احجز الآن"}
          </a>
        </div>

        <div className="mt-3">
          <a
            href="#check-booking"
            onClick={onCheckClick}
            className="inline-flex items-center gap-2 font-tajawal text-sm font-semibold text-beige/90 underline decoration-white/30 underline-offset-4 transition hover:text-gold hover:decoration-gold/60"
          >
            <span aria-hidden="true">↓</span>

            <span>{t("check_booking") || "تحقق من الحجز"}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
