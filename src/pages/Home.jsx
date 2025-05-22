import HeroSection from "../components/home/HeroSection";
import ContactSection from "../components/home/ContactSection";
import InstagramSlider from "../components/home/InstagramSlider";
import BookingSection from "../components/home/BookingSection";

function Home() {
  return (
    <main>
      <HeroSection />
<InstagramSlider />

        <BookingSection />

      <ContactSection />
    </main>
  );
}

export default Home;
