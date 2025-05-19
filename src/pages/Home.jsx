import HeroSection from "../components/home/HeroSection";
import AboutSection from "../components/home/AboutSection";
import ServicesSection from "../components/home/ServicesSection";
import ContactSection from "../components/home/ContactSection";
import InstagramSlider from "../components/home/InstagramSlider";
import BookingForm from "../components/booking/BookingForm";

function Home() {
  return (
    <main>
      <HeroSection />
<InstagramSlider />

      <AboutSection />
      <ServicesSection />
      <div id="booking">
        <BookingForm />
      </div>
      <ContactSection />

    </main>
  );
}

export default Home;
