import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

function HeroSection() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
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
    smoothScrollTo("booking");
  };

  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      {/* الصورة الكاملة */}
      <img
        src="/barber-hero.jpg"
        alt="Barber Hero"
        className="absolute inset-0 w-full h-full object-cover object-center z-0"
      />

      {/* طبقة تعتيم */}
      <div className="absolute inset-0 bg-black bg-opacity-60 z-10"></div>

      {/* النص */}
      <div
        className="relative z-20 text-center px-4 max-w-2xl"
        data-aos="fade-up"
      >
        <h1 className="font-notokufi text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight text-gold">
          {t("hero_title") || "أسلوب يليق بك، بكل بساطة"}
        </h1>

        <p className="text-lg md:text-xl mb-6 font-tajawal text-beige max-w-xl mx-auto">
          {t("hero_subtitle") || "لمحة مُظهرك، يناسبك ويعبر عنك"}
        </p>

        {/* Primary CTA */}
        <a
          href="#booking"
          onClick={onBookClick}
          className="inline-flex items-center justify-center bg-gold hover:bg-yellow-400 text-primary font-semibold px-6 py-3 rounded shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold"
        >
          {t("book_now") || "Book Now"}
        </a>

        {/* Secondary CTA (Perfect: lightweight + doesn’t compete) */}
        <div className="mt-3">
          <a
            href="#check-booking"
            onClick={onCheckClick}
            className="inline-flex items-center gap-2 text-sm font-tajawal font-semibold text-beige/90 hover:text-gold transition underline underline-offset-4 decoration-white/30 hover:decoration-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold rounded"
            aria-label={t("check_booking") || "تحقق من الحجز"}
          >
            <span aria-hidden="true">↓</span>
            <span>{t("check_booking") || "تحقق من الحجز"}</span>
          </a>

          {/* سطر ثقة صغير (اختياري، بس حلو جدًا للموبايل) */}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
