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
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location]);

  return (
    <main>
      <HeroSection />
      <InstagramSlider />
      <BookingSection />

      {/* ✅ هنا بالزبط */}
      <BarberRatingSection />

      <BookingTracker />
      <Footer />
      <BackToTopButton />
    </main>
  );
}

export default Home;
