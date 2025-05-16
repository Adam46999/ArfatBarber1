import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import heroImg from "../assets/barber-hero.jpg";

function Home() {
  const { t } = useTranslation();

  useEffect(() => {
AOS.init({
  duration: 1000,
  once: false, // ✅ خليها false عشان تشتغل كل مرة
});
  }, []);

  return (
    <main>
      {/* ===== HERO SECTION ===== */}
      <section
        className="relative h-screen bg-cover bg-center flex items-center justify-center text-white"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>

        <div className="relative z-10 text-center px-4 max-w-2xl" data-aos="fade-up">
          <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 leading-tight">
            {t("hero_title") || "We Know Your Style Better"}
          </h1>
          <p className="text-lg md:text-xl mb-6 font-body">
            {t("hero_subtitle") ||
              "There is a distinction between a beauty salon and a hair salon."}
          </p>
          <a
            href="#booking"
            className="bg-accent hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded shadow-md transition"
          >
            {t("book_now") || "Book Now"}
          </a>
        </div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section className="py-20 px-6 md:px-20 bg-white text-center text-gray-800">
        <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6" data-aos="fade-up">
          {t("about_us") || "About Us"}
        </h2>
        <p className="max-w-3xl mx-auto text-lg leading-relaxed font-body" data-aos="fade-up" data-aos-delay="200">
          {t("about_text") ||
            "Arfat Barber is more than just a barbershop. We provide personalized experiences that blend tradition and modern style."}
        </p>
      </section>

      {/* ===== SERVICES SECTION ===== */}
      <section className="py-20 px-6 md:px-20 bg-gray-100 text-gray-800">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-10" data-aos="fade-up">
          {t("services") || "Our Services"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center" data-aos="zoom-in">
            <h3 className="text-xl font-semibold mb-2 font-body">
              {t("service_haircut") || "Haircut"}
            </h3>
            <p className="font-body">
              {t("service_haircut_desc") || "Professional haircuts for every style."}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center" data-aos="zoom-in" data-aos-delay="100">
            <h3 className="text-xl font-semibold mb-2 font-body">
              {t("service_beard") || "Beard Trim"}
            </h3>
            <p className="font-body">
              {t("service_beard_desc") || "Clean and precise beard trimming."}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center" data-aos="zoom-in" data-aos-delay="200">
            <h3 className="text-xl font-semibold mb-2 font-body">
              {t("service_combo") || "Haircut & Beard"}
            </h3>
            <p className="font-body">
              {t("service_combo_desc") ||
                "Complete grooming experience with haircut and beard trim."}
            </p>
          </div>
        </div>
      </section>

      {/* ===== CONTACT SECTION ===== */}
      <section className="py-20 px-6 md:px-20 bg-primary text-white text-center">
        <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6" data-aos="fade-up">
          {t("contact") || "Contact Us"}
        </h2>
        <p className="mb-2 font-body" data-aos="fade-up" data-aos-delay="100">📍 123 Barber Street, City</p>
        <p className="mb-2 font-body" data-aos="fade-up" data-aos-delay="200">📞 +123 456 7890</p>
        <p className="mb-4 font-body" data-aos="fade-up" data-aos-delay="300">✉️ info@arfatbarber.com</p>
        <a
          href="#booking"
          className="inline-block bg-accent hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded shadow-md transition"
          data-aos="zoom-in"
        >
          {t("start_booking") || "Start Booking"}
        </a>
      </section>
    </main>
  );
}

export default Home;
