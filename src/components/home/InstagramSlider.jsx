import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Thumbs, Zoom } from "swiper/modules";

import AOS from "aos";
import "aos/dist/aos.css";

import "swiper/css";
import "swiper/css/thumbs";
import "swiper/css/zoom";


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
  "/cuts/p12.jpg",
  "/cuts/p13.jpg",
  "/cuts/p14.jpg",
  "/cuts/p15.jpg",
  "/cuts/p16.jpg",
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
  const [viewerSwiper, setViewerSwiper] = useState(null);
  const viewerClosingRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [openedImage, setOpenedImage] = useState(null);

  useEffect(() => {
    if (openedImage !== null) {
      viewerClosingRef.current = false;
    }
  }, [openedImage]);


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
    if (openedImage === null || !viewerSwiper) {
      return undefined;
    }

    const handleViewerKeys = (event) => {
      if (event.key === "ArrowLeft") {
        viewerSwiper.slidePrev();
      }

      if (event.key === "ArrowRight") {
        viewerSwiper.slideNext();
      }
    };

    window.addEventListener("keydown", handleViewerKeys);

    return () => {
      window.removeEventListener("keydown", handleViewerKeys);
    };
  }, [openedImage, viewerSwiper]);

  useEffect(() => {
    if (openedImage === null) {
      return;
    }

    const neighbours = [
      (openedImage - 1 + images.length) % images.length,
      (openedImage + 1) % images.length,
    ];

    neighbours.forEach((index) => {
      const preload = new Image();
      preload.src = images[index];
    });
  }, [openedImage]);

  const handleMainSlideChange = (swiper) => {
    setActiveIndex(swiper.realIndex);
  };

  const handleThumbnailClick = (index) => {
    mainSwiper?.slideToLoop(index);
  };

  const closeFullscreen = () => {
    if (viewerClosingRef.current) {
      return;
    }

    viewerClosingRef.current = true;
    const lastViewedIndex = openedImage;

    // Close immediately. Do not call viewer methods while unmounting.
    setOpenedImage(null);
    setViewerSwiper(null);

    if (lastViewedIndex !== null) {
      requestAnimationFrame(() => {
        try {
          mainSwiper?.slideToLoop(lastViewedIndex, 0);
        } catch (error) {
          console.warn("Gallery position sync skipped:", error);
        }
      });
    }
  };

  const validThumbsSwiper =
    thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null;

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#fbfaf7_0%,#f3ead7_48%,#fbfaf7_100%)] px-3 py-12 text-center sm:px-5 md:px-10 md:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute left-1/2 top-4 h-40 w-[72%] -translate-x-1/2 rounded-full bg-white/60 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
        </div>

        <div
          className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-[#d6b864]/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,252,245,0.92)_100%)] px-3 py-6 shadow-[0_28px_80px_rgba(71,52,15,0.16)] ring-1 ring-white/90 backdrop-blur-xl sm:px-5 sm:py-8 md:rounded-[38px] md:px-7 md:py-10"
          data-aos="fade-up"
        >
          <div className="relative z-10 mx-auto mb-6 max-w-2xl px-2 md:mb-9">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d5b55f]/35 bg-[#fbf4df]/80 px-3 py-1.5 shadow-[0_6px_18px_rgba(159,119,31,0.10)] backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c79a36]/12 text-[#9a7220]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="m21 15-4.5-4.5L8 19" />
                </svg>
              </span>

              <span className="text-[11px] font-extrabold tabular-nums tracking-[0.18em] text-[#806628]">
                {images.length}
              </span>

              <span className="h-1 w-1 rounded-full bg-[#c79a36]/70" />

              <span className="h-1.5 w-1.5 rounded-full bg-[#c79a36] shadow-[0_0_0_4px_rgba(199,154,54,0.10)]" />
            </div>

            <h2 className="font-heading text-[2rem] font-black leading-tight tracking-[-0.025em] text-[#30291f] sm:text-4xl md:text-[2.65rem]">
              <span className="relative inline-block">
                {t("slider_title") || "????? ?? ???????"}

                <span
                  className="absolute -bottom-2 left-1/2 h-[3px] w-[72%] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#c79a36] to-transparent shadow-[0_2px_10px_rgba(199,154,54,0.35)]"
                  aria-hidden="true"
                />
              </span>
            </h2>

            <div
              className="mt-5 flex items-center justify-center md:hidden"
              aria-hidden="true"
            >
              <div className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.06] bg-white/75 px-3 py-1.5 shadow-sm backdrop-blur">
                <svg
                  viewBox="0 0 32 16"
                  fill="none"
                  className="h-4 w-8 text-[#9a7b39] motion-safe:animate-pulse"
                >
                  <path
                    d="M2 8h28M6 4 2 8l4 4M26 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c79a36]/35" />
                  <span className="h-1.5 w-3.5 rounded-full bg-[#c79a36]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c79a36]/35" />
                </span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-[#d4b76d]/30 bg-[linear-gradient(180deg,rgba(241,232,213,0.82)_0%,rgba(255,255,255,0.78)_100%)] p-1.5 shadow-[0_18px_48px_rgba(59,44,13,0.13)] ring-1 ring-white/75 sm:p-2 md:rounded-[34px]">
            <div className="pointer-events-none absolute inset-x-8 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white to-transparent" aria-hidden="true" />

            <div className="pointer-events-none absolute left-3 top-3 z-20 h-7 w-7 rounded-tl-xl border-l border-t border-white/65" aria-hidden="true" />
            <div className="pointer-events-none absolute right-3 top-3 z-20 h-7 w-7 rounded-tr-xl border-r border-t border-white/65" aria-hidden="true" />
            <Swiper
              modules={[Thumbs]}
              onSwiper={setMainSwiper}
              onSlideChange={handleMainSlideChange}
              thumbs={{
                swiper: validThumbsSwiper,
              }}
              loop
              speed={480}
              grabCursor
              resistanceRatio={0.82}
              threshold={5}
              touchRatio={1}
              followFinger
              longSwipesRatio={0.22}
              longSwipesMs={220}
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
                    className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[26px] border border-white/70 bg-[#17140f] text-left shadow-[0_18px_44px_rgba(31,23,8,0.22)] outline-none transition duration-300 active:scale-[0.995] focus-visible:ring-4 focus-visible:ring-gold/40 md:rounded-[32px]"
                    aria-label={`${t("open_image") || "فتح الصورة"} ${
                      index + 1
                    }`}
                  >
                    <div className="relative isolate flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[#17140f] sm:aspect-[16/11] md:aspect-[16/10]">
                      <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl saturate-75"
                        loading="lazy"
                        draggable="false"
                      />

                      <div
                        className="absolute inset-0 z-[1] bg-gradient-to-b from-black/5 via-transparent to-black/25"
                        aria-hidden="true"
                      />

                      <img
                        src={image}
                        alt={`${t("slider_title")} ${index + 1}`}
                        className="relative z-[2] h-full w-full object-contain"
                        loading={index === 0 ? "eager" : "lazy"}
                        draggable="false"
                      />

                      <span className="absolute bottom-3 end-3 z-[3] rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-bold tabular-nums text-white shadow-lg backdrop-blur-md sm:bottom-4 sm:end-4">
                        {index + 1} / {images.length}
                      </span>
                    </div>
                  </button>
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="mt-4 flex items-center gap-3 px-1 md:mt-5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#c99a35] to-gold transition-[width] duration-300 ease-out"
                  style={{
                    width: `${((activeIndex + 1) / images.length) * 100}%`,
                  }}
                />
              </div>

              <span className="min-w-[3.8rem] text-end text-xs font-bold tabular-nums tracking-wide text-[#7c6740]">
                {activeIndex + 1} / {images.length}
              </span>
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
                className="hidden select-none sm:block"
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
                            : "border-transparent opacity-55 hover:opacity-85"
                        }`}
                        aria-label={`${t("show_image") || "عرض الصورة"} ${
                          index + 1
                        }`}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-contain"
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
          className="fixed inset-0 z-[9999] overflow-hidden bg-[#080706]/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={t("image_preview") || "??? ????? ?????? ??????"}
        >
          <div
            className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.04),transparent_55%)]"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 sm:top-6"
            style={{
              top: "max(1rem, env(safe-area-inset-top))",
            }}
          >
            <div className="rounded-full border border-white/15 bg-black/45 px-3.5 py-1.5 text-xs font-bold tabular-nums tracking-[0.08em] text-white shadow-lg backdrop-blur-xl">
              {openedImage + 1} / {images.length}
            </div>
          </div>

          <button
            type="button"
            data-swiper-no-swiping
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeFullscreen();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeFullscreen();
            }}
            className="swiper-no-swiping pointer-events-auto absolute z-[10000] flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-black/75 text-white shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-xl transition duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            style={{
              top: "max(0.75rem, env(safe-area-inset-top))",
              right: "max(0.75rem, env(safe-area-inset-right))",
              pointerEvents: "auto",
            }}
            aria-label={t("close") || "Close"}
          >
            <CloseIcon />
          </button>

          <Swiper
            modules={[Zoom]}
            onSwiper={setViewerSwiper}
            initialSlide={openedImage}
            onSlideChange={(swiper) => {
              if (!viewerClosingRef.current) {
                setOpenedImage(swiper.realIndex);
              }
            }}
            loop
            zoom={{
              maxRatio: 3,
              minRatio: 1,
              toggle: true,
            }}
            speed={420}
            threshold={5}
            resistanceRatio={0.85}
            longSwipesRatio={0.2}
            longSwipesMs={220}
            grabCursor
            noSwiping
            noSwipingSelector="button, [data-swiper-no-swiping]"
            touchStartPreventDefault={false}
            className="h-[100svh] w-full select-none"
          >
            {images.map((image, index) => (
              <SwiperSlide
                key={`fullscreen-${image}`}
                className="!flex h-full items-center justify-center"
              >
                <div
                  className="flex h-full w-full items-center justify-center px-2 pb-24 pt-20 sm:px-20 sm:pb-14 sm:pt-14"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      closeFullscreen();
                    }
                  }}
                >
                  <div className="swiper-zoom-container !flex h-full w-full !items-center !justify-center">
                    <img
                      src={image}
                      alt={`${t("slider_title")} ${index + 1}`}
                      className="max-h-[78svh] max-w-full rounded-[14px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:max-h-[88vh] sm:rounded-[22px]"
                      loading={index === openedImage ? "eager" : "lazy"}
                      draggable="false"
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            onClick={() => viewerSwiper?.slidePrev()}
            className="absolute left-5 top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white shadow-xl backdrop-blur-xl transition hover:scale-105 hover:bg-white hover:text-black active:scale-95 sm:flex"
            aria-label={t("previous_image") || "?????? ???????"}
          >
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
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => viewerSwiper?.slideNext()}
            className="absolute right-5 top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white shadow-xl backdrop-blur-xl transition hover:scale-105 hover:bg-white hover:text-black active:scale-95 sm:flex"
            aria-label={t("next_image") || "?????? ???????"}
          >
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
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="pointer-events-none absolute bottom-[5.8rem] left-1/2 z-40 w-28 -translate-x-1/2 sm:bottom-7">
            <div className="h-1 overflow-hidden rounded-full bg-white/20 backdrop-blur">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
                style={{
                  width: `${((openedImage + 1) / images.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 z-[90] px-3 sm:hidden"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto flex max-w-sm items-center justify-between gap-3 rounded-[22px] border border-white/15 bg-black/70 px-3 py-2.5 shadow-[0_-8px_32px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <span className="min-w-[3.4rem] text-start text-xs font-bold tabular-nums tracking-[0.08em] text-white/75">
                {openedImage + 1} / {images.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-swiper-no-swiping
                  onPointerDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    viewerSwiper?.slidePrev();
                  }}
                  className="swiper-no-swiping flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-white/10 text-white active:scale-90"
                  aria-label={t("previous_image") || "Previous"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>

                <button
                  type="button"
                  data-swiper-no-swiping
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeFullscreen();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeFullscreen();
                  }}
                  className="swiper-no-swiping pointer-events-auto flex h-11 min-w-[5.4rem] touch-manipulation items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-black shadow-lg active:scale-95"
                  aria-label={t("close") || "Close"}
                >
                  <CloseIcon />
                  <span>{t("close") || "Close"}</span>
                </button>

                <button
                  type="button"
                  data-swiper-no-swiping
                  onPointerDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    viewerSwiper?.slideNext();
                  }}
                  className="swiper-no-swiping flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-white/10 text-white active:scale-90"
                  aria-label={t("next_image") || "Next"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default InstagramSlider;
