import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import HeroSection from "../components/home/HeroSection";
import ContactSection from "../components/home/ContactSection";
import InstagramSlider from "../components/home/InstagramSlider";
import BookingSection from "../components/booking/BookingSection";
import BookingTracker from "../components/booking/BookingTracker";
import Footer from "../components/layout/Footer";
import BackToTopButton from "../components/BackToTopButton";

// ✅ جديد
import BarberRatingSection from "../components/reviews/BarberRatingSection";

function Home() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get("scrollTo");
    if (!targetId) return;

    const realId =
      targetId === "booking" && document.getElementById("booking-form-start")
        ? "booking-form-start"
        : targetId;

    const element = document.getElementById(realId);
    if (element) {
      setTimeout(() => {
        const y =
          element.getBoundingClientRect().top + window.pageYOffset - 100; // 👈 عدل الرقم هون

        window.scrollTo({
          top: y,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [location]);

  return (
    <main id="main">
      <HeroSection />
      <InstagramSlider />
      <BookingSection />
      <BarberRatingSection />
      <BookingTracker />
      <Footer />
      <BackToTopButton />
    </main>
  );
}

export default Home;
