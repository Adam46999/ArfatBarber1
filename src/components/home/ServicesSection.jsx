import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AOS from "aos";
import "aos/dist/aos.css";

function ServicesSection() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <section className="py-20 px-6 md:px-20 bg-gray-100 text-gray-800 font-body">
      <h2
        className="text-3xl md:text-4xl font-heading font-bold text-center mb-10 text-gold"
        data-aos="fade-up"
      >
        {t("services") || "Our Services"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Haircut */}
        <div className="bg-white p-6 rounded-lg shadow-md text-center" data-aos="zoom-in">
          <h3 className="text-xl font-semibold mb-2 font-heading text-primary">
            {t("service_haircut") || "Haircut"}
          </h3>
          <p>{t("service_haircut_desc") || "Professional haircuts for every style."}</p>
        </div>

        {/* Beard Trim */}
        <div
          className="bg-white p-6 rounded-lg shadow-md text-center"
          data-aos="zoom-in"
          data-aos-delay="100"
        >
          <h3 className="text-xl font-semibold mb-2 font-heading text-primary">
            {t("service_beard") || "Beard Trim"}
          </h3>
          <p>{t("service_beard_desc") || "Clean and precise beard trimming."}</p>
        </div>

        {/* Combo */}
        <div
          className="bg-white p-6 rounded-lg shadow-md text-center"
          data-aos="zoom-in"
          data-aos-delay="200"
        >
          <h3 className="text-xl font-semibold mb-2 font-heading text-primary">
            {t("service_combo") || "Haircut & Beard"}
          </h3>
          <p>
            {t("service_combo_desc") ||
              "Complete grooming experience with haircut and beard trim."}
          </p>
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
