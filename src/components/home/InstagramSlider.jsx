import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Thumbs } from "swiper/modules";
import SectionTitle from "../common/SectionTitle";

import AOS from "aos";
import "aos/dist/aos.css";

import "swiper/css";
import "swiper/css/thumbs";
import "swiper/css/autoplay";

const AUTOPLAY_DELAY = 5000;

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

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function InstagramSlider() {
  const { t } = useTranslation();

  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [mainSwiper, setMainSwiper] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [openedImage, setOpenedImage] = useState(null);

  const progressAnimationFrameRef = useRef(null);

  useEffect(() => {
    AOS.init({
      duration: 900,
      once: true,
    });
  }, []);

  useEffect(() => {
    if (openedImage === null) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenedImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openedImage]);

  useEffect(() => {
    return () => {
      if (progressAnimationFrameRef.current) {
        cancelAnimationFrame(progressAnimationFrameRef.current);
      }
    };
  }, []);

  const handleAutoplayTimeLeft = (_swiper, _timeLeft, percentage) => {
    if (progressAnimationFrameRef.current) {
      cancelAnimationFrame(progressAnimationFrameRef.current);
    }

    progressAnimationFrameRef.current = requestAnimationFrame(() => {
      setProgress(Math.max(0, Math.min(100, (1 - percentage) * 100)));
    });
  };

  const handleMainSlideChange = (swiper) => {
    setActiveIndex(swiper.realIndex);
    setProgress(0);
  };

  const handleThumbnailClick = (index) => {
    mainSwiper?.slideToLoop(index);
  };

  const closeFullscreen = () => {
    setOpenedImage(null);
  };

  const validThumbsSwiper =
    thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null;

  return (
    <>
      <section className="relative overflow-hidden bg-[#f8f6f1] px-3 py-14 text-center sm:px-5 md:px-10 md:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        </div>

        <div
          className="relative mx-auto max-w-5xl rounded-[26px] border border-black/[0.05] bg-white/95 px-3 py-6 shadow-[0_20px_60px_rgba(30,25,15,0.10)] backdrop-blur-sm sm:px-5 sm:py-8 md:rounded-[32px] md:px-7 md:py-10"
          data-aos="fade-up"
        >
          <div className="mb-5 md:mb-7">
            <SectionTitle>
              {t("slider_title") || "قصّات من لمساتنا"}
            </SectionTitle>
          </div>

          <div className="relative mx-auto max-w-4xl overflow-hidden">
            <Swiper
              modules={[Autoplay, Thumbs]}
              onSwiper={setMainSwiper}
              onSlideChange={handleMainSlideChange}
              onAutoplayTimeLeft={handleAutoplayTimeLeft}
              thumbs={{
                swiper: validThumbsSwiper,
              }}
              autoplay={{
                delay: AUTOPLAY_DELAY,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              loop
              speed={700}
              grabCursor
              resistanceRatio={0.7}
              threshold={5}
              touchRatio={1}
              watchSlidesProgress
              spaceBetween={10}
              slidesPerView={1.08}
              centeredSlides
              breakpoints={{
                640: {
                  slidesPerView: 1,
                  centeredSlides: false,
                  spaceBetween: 0,
                },
              }}
              className="overflow-visible"
            >
              {images.map((image, index) => (
                <SwiperSlide key={image}>
                  <button
                    type="button"
                    onClick={() => setOpenedImage(index)}
                    className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[22px] bg-[#eeeae1] text-left shadow-[0_12px_32px_rgba(18,15,10,0.15)] outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-gold/40 md:rounded-[28px]"
                    aria-label={`${t("open_image") || "فتح الصورة"} ${
                      index + 1
                    }`}
                  >
                    <div className="aspect-[4/5] w-full sm:aspect-[16/11] md:aspect-[16/10]">
                      <img
                        src={image}
                        alt={`${t("slider_title") || "نماذج من أعمالنا"} ${
                          index + 1
                        }`}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                        loading={index === 0 ? "eager" : "lazy"}
                        draggable="false"
                      />
                    </div>

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent opacity-70" />
                  </button>
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.08]">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-100 ease-linear"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className="mt-4 md:mt-5">
              <Swiper
                modules={[Thumbs]}
                onSwiper={setThumbsSwiper}
                watchSlidesProgress
                freeMode
                grabCursor
                resistanceRatio={0.65}
                spaceBetween={10}
                slidesPerView={3.35}
                breakpoints={{
                  480: {
                    slidesPerView: 4.2,
                    spaceBetween: 10,
                  },
                  640: {
                    slidesPerView: 5.2,
                    spaceBetween: 12,
                  },
                  900: {
                    slidesPerView: 6.4,
                    spaceBetween: 12,
                  },
                }}
                className="select-none"
              >
                {images.map((image, index) => {
                  const isActive = activeIndex === index;

                  return (
                    <SwiperSlide key={`thumbnail-${image}`}>
                      <button
                        type="button"
                        onClick={() => handleThumbnailClick(index)}
                        className={`relative block aspect-square w-full overflow-hidden rounded-[15px] border-[3px] bg-[#eeeae1] outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-gold/30 ${
                          isActive
                            ? "scale-[0.98] border-gold opacity-100 shadow-[0_8px_22px_rgba(179,135,39,0.24)]"
                            : "border-transparent opacity-45 hover:opacity-75"
                        }`}
                        aria-label={`${t("show_image") || "عرض الصورة"} ${
                          index + 1
                        }`}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          draggable="false"
                        />

                        {isActive && (
                          <span
                            className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-inset ring-white/70"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>
          </div>
        </div>
      </section>

      {openedImage !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t("image_preview") || "عرض الصورة بالحجم الكامل"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFullscreen();
            }
          }}
        >
          <button
            type="button"
            onClick={closeFullscreen}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur transition hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:right-6 sm:top-6"
            aria-label={t("close") || "إغلاق"}
          >
            <CloseIcon />
          </button>

          <div className="flex h-full w-full items-center justify-center">
            <img
              src={images[openedImage]}
              alt={`${t("slider_title") || "نماذج من أعمالنا"} ${
                openedImage + 1
              }`}
              className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default InstagramSlider;
