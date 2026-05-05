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

    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setHeroNote(data.heroNote || null);
      setNoteClosed(false);
    });

    return () => unsub();
  }, []);

  const smoothScrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onCheckClick = (e) => {
    e.preventDefault();
    smoothScrollTo("check-booking");
  };

  const onBookClick = (e) => {
    e.preventDefault();

    const el = document.getElementById("booking-form-start");
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 100;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="hero-overlay relative w-full min-h-[100svh] h-screen overflow-hidden flex items-center justify-center">
      <img
        src="/barber-hero.jpg"
        alt="Barber Hero"
        className="hero-media absolute inset-0 w-full h-full object-cover object-center z-0"
        loading="eager"
      />

      <div
        className="hero-content text-center px-4 max-w-2xl"
        data-aos="fade-up"
      >
        <h1
          className="font-notokufi text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight text-gold"
          style={{
            textShadow:
              "0 2px 6px rgba(0,0,0,0.85), 0 6px 24px rgba(0,0,0,0.6)",
          }}
        >
          {t("hero_title") || "أسلوب يليق بك، بكل بساطة"}
        </h1>

        <p className="text-base sm:text-lg md:text-xl mb-6 font-tajawal text-beige max-w-xl mx-auto leading-relaxed">
          {t("hero_subtitle") || "لمحة مُظهرك، يناسبك ويعبر عنك"}
        </p>

        {heroNote?.enabled && heroNote?.text && !noteClosed && (
          <div
            className={`relative mx-auto mb-6 max-w-xl rounded-2xl border px-5 py-3 pr-10 text-sm sm:text-base font-bold shadow-lg animate-pulse ${
              heroNote.type === "important"
                ? "bg-rose-100 text-rose-900 border-rose-300"
                : heroNote.type === "offer"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-yellow-100 text-yellow-900 border-yellow-300"
            }`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <span className="ml-2">📌</span>
            {heroNote.text}

            <button
              type="button"
              onClick={() => setNoteClosed(true)}
              className="absolute top-2 right-3 text-lg leading-none opacity-70 hover:opacity-100"
              aria-label="إغلاق الملاحظة"
            >
              ×
            </button>
          </div>
        )}

        <div>
          <a
            href="#booking-form-start"
            onClick={onBookClick}
            className="inline-flex items-center justify-center bg-gold hover:bg-yellow-400 text-primary font-semibold px-7 py-3.5 rounded-xl shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold"
            style={{ minHeight: 44 }}
          >
            {t("book_now") || "احجز الآن"}
          </a>
        </div>

        <div className="mt-3">
          <a
            href="#check-booking"
            onClick={onCheckClick}
            className="inline-flex items-center gap-2 text-sm font-tajawal font-semibold text-beige/90 hover:text-gold transition underline underline-offset-4 decoration-white/30 hover:decoration-gold/60"
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
