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

  return (
    <section className="bg-[#fdfdfd] py-20 px-4 md:px-16 text-center">
      <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-10">
        قصّات من لمساتنا
      </h2>

      <div className="max-w-2xl mx-auto">
        {/* المعرض الكبير – الحركة الانسيابية */}
        <Swiper
          modules={[Autoplay, Thumbs]}
          thumbs={{ swiper: thumbsSwiper }}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={true}
          spaceBetween={10}
          speed={1200} // ← سلاسة
          grabCursor={true}
          className="rounded-xl shadow-lg overflow-hidden"
        >
          {images.map((src, i) => (
            <SwiperSlide key={i}>
              <img
                src={src}
                alt={`cut-${i}`}
                className="w-full h-[450px] object-cover transition-transform duration-700 ease-in-out hover:scale-105"
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* شريط الصور المصغرة - مصقول */}
        <Swiper
          modules={[Thumbs]}
          onSwiper={setThumbsSwiper}
          slidesPerView={5}
          spaceBetween={10}
          watchSlidesProgress
          className="mt-4"
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
    </section>
  );
}

export default InstagramSlider;
