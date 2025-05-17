import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from "react-router-dom";

function AboutContent() {
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <main className="font-body">

      {/* Hero */}
      <section className="h-[70vh] bg-cover bg-center flex items-center justify-center text-white relative" style={{ backgroundImage: "url('/barber.jpg')" }}>
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <div className="relative z-10 text-center px-4" data-aos="fade-up">
          <h1 className="text-4xl md:text-5xl font-heading text-gold font-bold mb-4">
            {t("about") || "About Us"}
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            {t("about_text") || "Where precision meets passion — Arfat Barber is a name of trust and style."}
          </p>
        </div>
      </section>

      {/* من نحن */}
      <section className="py-20 px-6 md:px-20 bg-white text-darkText text-center">
        <h2 className="text-3xl font-heading font-bold mb-6 text-gold" data-aos="fade-up">Who We Are</h2>
        <p className="max-w-3xl mx-auto text-lg leading-relaxed" data-aos="fade-up" data-aos-delay="100">
          Arfat Barber isn't just a barbershop — it's a space of self-expression, confidence, and expert care. With years of experience and a passion for grooming, we offer premium services tailored to every style.
        </p>
      </section>

      {/* الرؤية والرسالة */}
      <section className="py-16 px-6 md:px-20 bg-gray-100 grid md:grid-cols-2 gap-8 text-darkText">
        <div className="bg-white p-8 rounded-lg shadow-md" data-aos="fade-right">
          <h3 className="text-xl font-bold text-gold mb-3 font-heading">💡 Our Vision</h3>
          <p>To be the region’s go-to destination for men who value style, comfort, and consistency.</p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md" data-aos="fade-left">
          <h3 className="text-xl font-bold text-gold mb-3 font-heading">🎯 Our Mission</h3>
          <p>Empowering confidence through every haircut, every detail, and every customer interaction.</p>
        </div>
      </section>

      {/* لماذا نحن؟ */}
      <section className="py-20 px-6 md:px-20 bg-white text-center text-darkText">
        <h2 className="text-3xl font-heading font-bold mb-12 text-gold" data-aos="fade-up">Why Choose Us?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg shadow-md border" data-aos="zoom-in">
            <h4 className="text-xl font-heading mb-2 text-primary">✂️ Skilled Barbers</h4>
            <p>Trained hands, sharp results — every time.</p>
          </div>
          <div className="p-6 rounded-lg shadow-md border" data-aos="zoom-in" data-aos-delay="100">
            <h4 className="text-xl font-heading mb-2 text-primary">🧼 Clean & Calm</h4>
            <p>We care about hygiene and customer comfort.</p>
          </div>
          <div className="p-6 rounded-lg shadow-md border" data-aos="zoom-in" data-aos-delay="200">
            <h4 className="text-xl font-heading mb-2 text-primary">📍 Great Location</h4>
            <p>Easy to reach, hard to forget.</p>
          </div>
        </div>
      </section>

      {/* دعوة للحجز */}
      <section className="py-20 px-6 md:px-20 bg-primary text-white text-center">
        <h2 className="text-3xl font-heading font-bold mb-6 text-gold" data-aos="fade-up">
          Ready for Your Next Look?
        </h2>
        <p className="mb-4" data-aos="fade-up" data-aos-delay="100">Join our list of happy clients. Book your session today!</p>
        <Link
          to="/booking-form"
          className="bg-gold hover:bg-yellow-400 text-primary font-semibold px-6 py-3 rounded-full shadow-md transition"
          data-aos="zoom-in"
          data-aos-delay="200"
        >
          {t("book_now") || "Book Now"}
        </Link>
      </section>

    </main>
  );
}

export default AboutContent;
