import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

import Home from './pages/Home';
import BookingIntro from './pages/BookingIntro';
import NotFound from './pages/NotFound';
import Contact from './pages/Contact';
import BarberPanel from "./pages/BarberPanel";
import BookingForm from "./pages/BookingForm";
import AdminBookings from "./pages/AdminBookings";
import Login from "./pages/Login";

// PrivateRoute يستخدم localStorage للتحقق من تسجيل الدخول اليدوي
function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("barberUser");
    setIsLoggedIn(!!user);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return isLoggedIn ? children : <Navigate to="/login" />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/booking" element={<BookingIntro />} />
      <Route path="/booking-form" element={<BookingForm />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />

      {/* مسارات خاصة محمية */}
      <Route path="/barber" element={
        <PrivateRoute>
          <BarberPanel />
        </PrivateRoute>
      } />
      <Route path="/admin-bookings" element={
        <PrivateRoute>
          <AdminBookings />
        </PrivateRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
