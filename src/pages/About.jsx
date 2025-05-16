import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

function About() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <section className="min-h-screen bg-primary text-light px-6 py-20 font-body">
      <div className="max-w-4xl mx-auto text-center" data-aos="fade-up">
        <h1 className="text-4xl font-heading text-gold mb-6">{t("about") || "About Us"}</h1>
        <p className="text-lg text-gray-300 leading-relaxed">
          {t("about_text") ||
            "At Arfat Barber, we blend tradition with modern style. Our mission is to deliver premium grooming experiences tailored to each client's unique personality. With skilled barbers and a relaxing atmosphere, we aim to make every visit memorable."}
        </p>
      </div>

      <div className="mt-16 grid md:grid-cols-2 gap-8" data-aos="fade-up" data-aos-delay="200">
        <div className="bg-white text-darkText p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3 text-gold">✂️ Our Vision</h3>
          <p>
            To be the go-to grooming destination that offers confidence, comfort, and class to every client.
          </p>
        </div>

        <div className="bg-white text-darkText p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3 text-gold">💈 Our Craft</h3>
          <p>
            Every haircut, every beard trim, every detail — handled with precision and pride by expert hands.
          </p>
        </div>
      </div>
    </section>
  );
}

export default About;
