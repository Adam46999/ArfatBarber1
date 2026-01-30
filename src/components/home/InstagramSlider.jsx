import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Thumbs } from "swiper/modules";
import SectionTitle from "../common/SectionTitle";

import AOS from "aos";
import "aos/dist/aos.css";

import "swiper/css";
import "swiper/css/thumbs";
import "swiper/css/autoplay";

const images = [
  "/cuts/p1.jpg",
  "/cuts/p2.jpg",
  "/cuts/p3.jpg",
  "/cuts/p4.jpg",
  "/cuts/p5.jpg",
  "/cuts/p6.jpg",
  "/cuts/p8.jpg",
  "/cuts/p9.jpg",
  "/cuts/p10.jpg",
  "/cuts/p11.jpg",
];

function InstagramSlider() {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  return (
    <section className="relative bg-[#f8f6f1] py-20 px-4 md:px-16 text-center overflow-hidden">
      {/* ديكور خفيف جداً (يعطي حياة بدون ما يزعج) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div
        className="relative max-w-5xl mx-auto bg-white/90 backdrop-blur rounded-3xl shadow-lg p-8 md:p-12 border border-gold/10 transition-transform duration-300 hover:-translate-y-1"
        data-aos="fade-up"
      >
        <SectionTitle>{t("slider_title") || "قصّات من لمساتنا"}</SectionTitle>

        <div className="rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5">
          <Swiper
            modules={[Autoplay, Thumbs]}
            thumbs={{ swiper: thumbsSwiper }}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop={true}
            spaceBetween={10}
            speed={1100}
            grabCursor={true}
          >
            {images.map((src, i) => (
              <SwiperSlide key={i}>
                <img
                  src={src}
                  alt={`cut-${i}`}
                  className="w-full h-[420px] md:h-[450px] object-cover transition-transform duration-700 ease-in-out hover:scale-105"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="mt-6">
          <Swiper
            modules={[Thumbs]}
            onSwiper={setThumbsSwiper}
            slidesPerView={5}
            spaceBetween={10}
            watchSlidesProgress
          >
            {images.map((src, i) => (
              <SwiperSlide key={i}>
                <img
                  src={src}
                  alt={`thumb-${i}`}
                  className="w-full h-20 object-cover rounded-xl border border-transparent hover:border-gold/70 transition-all duration-300 cursor-pointer ring-1 ring-black/5"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}

export default InstagramSlider;
