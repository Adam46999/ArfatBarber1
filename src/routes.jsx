import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BookingIntro from './pages/BookingIntro'; // أضف هذا السطر
import BookingForm from "./components/booking/BookingForm";
import NotFound from './pages/NotFound';
import About from './pages/About';
import Contact from './pages/Contact';
import BarberPanel from "./pages/BarberPanel";


export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/booking" element={<BookingIntro />} /> {/* ✅ هذا السطر مهم */}
      <Route path="/booking-form" element={<BookingForm />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/about" element={<About />} />
<Route path="/contact" element={<Contact />} />
<Route path="/barber" element={<BarberPanel />} />

    </Routes>
  );
}
