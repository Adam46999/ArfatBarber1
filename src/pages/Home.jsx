import HeroSection from "../components/home/HeroSection";
import AboutSection from "../components/home/AboutSection";
import ContactSection from "../components/home/ContactSection";
import InstagramSlider from "../components/home/InstagramSlider";
import BookingSection from "../components/home/BookingSection";

function Home() {
  return (
    <main>
      <HeroSection />
<InstagramSlider />

      <AboutSection />
        <BookingSection />

      <ContactSection />
    </main>
  );
}

export default Home;
