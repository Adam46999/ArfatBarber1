import HeroSection from "../components/home/HeroSection";
import ContactSection from "../components/home/ContactSection";
import InstagramSlider from "../components/home/InstagramSlider";
import BookingSection from "../components/home/BookingSection";
import SecretBarberButton from "../components/SecretBarberButton";

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
