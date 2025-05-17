import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AOS from "aos";
import "aos/dist/aos.css";

function AboutSection() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <section className="py-20 px-6 md:px-20 bg-white text-center text-gray-800 font-body">
      <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-gold" data-aos="fade-up">
        {t("about") || "About Us"}
      </h2>

      <p
        className="max-w-3xl mx-auto text-lg leading-relaxed text-gray-700"
        data-aos="fade-up"
        data-aos-delay="200"
      >
        {t("about_text") ||
          "Arfat Barber is more than just a barbershop. We provide personalized experiences that blend tradition and modern style."}
      </p>
    </section>
  );
}

export default AboutSection;
