import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

function HeroSection() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

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
      <div className="relative z-20 text-center px-4 max-w-2xl" data-aos="fade-up">
        <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 leading-tight text-gold">
          {t("hero_title") || "We Know Your Style Better"}
        </h1>
        <p className="text-lg md:text-xl mb-6 font-body text-white">
          {t("hero_subtitle") ||
            "There is a distinction between a beauty salon and a hair salon."}
        </p>
        <a
  href="#booking"
  className="bg-gold hover:bg-yellow-400 text-primary font-semibold px-6 py-3 rounded shadow-md transition"
>
  {t("book_now") || "Book Now"}
</a>

      </div>
    </section>
  );
}

export default HeroSection;
