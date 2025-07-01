import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Thumbs } from "swiper/modules";
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
  "/cuts/p7.jpg",
];

function InstagramSlider() {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const { t } = useTranslation();

  return (
    <section className="bg-gray-50 py-20 px-4 md:px-16 text-center">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-tajawal font-bold text-gold tracking-tight leading-snug mb-10">
  {t("slider_title") || "قصّات من لمساتنا"}
</h2>


        <div className="rounded-xl overflow-hidden shadow-md">
          <Swiper
            modules={[Autoplay, Thumbs]}
            thumbs={{ swiper: thumbsSwiper }}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop={true}
            spaceBetween={10}
            speed={1200}
            grabCursor={true}
          >
            {images.map((src, i) => (
              <SwiperSlide key={i}>
                <img
                  src={src}
                  alt={`cut-${i}`}
                  className="w-full h-[450px] object-cover transition-transform duration-700 ease-in-out hover:scale-105 rounded-xl"
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
                  className="w-full h-20 object-cover rounded-md border hover:border-gold transition-all duration-300 cursor-pointer"
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
