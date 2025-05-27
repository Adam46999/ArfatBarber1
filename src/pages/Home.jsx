import HeroSection from "../components/home/HeroSection";
import ContactSection from "../components/home/ContactSection";
import InstagramSlider from "../components/home/InstagramSlider";
import BookingSection from "../components/booking/BookingSection";
import SecretBarberButton from "../components/shared/SecretBarberButton";

function Home() {
  return (
    <main>
      <HeroSection />
<InstagramSlider />

        <BookingSection />

      <ContactSection />
          <SecretBarberButton />

    </main>
  );
}

export default Home;
