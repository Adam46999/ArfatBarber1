// src/hooks/useBookingSubmit.js
import { useState, useEffect, useRef } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "../firebase";
import {
  isPhoneBlocked,
  hasExistingBookings,
  hasActiveConflict,
  createBooking,
} from "../services/bookingService";

/**
 * مسؤول عن التحقق والإرسال وإنشاء كود الحجز + معالجة رسائل النجاح
 * المتطلبات: تمرير قيم النموذج ودالة الترجمة t
 */
export default function useBookingSubmit(form, setForm, t) {
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [code, setCode] = useState("");
  const messageRef = useRef(null);

  // شريط التقدم (5 خطوات)
  const { fullName, phoneNumber, selectedDate, selectedTime, selectedService } =
    form;
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    if (fullName) current++;
    if (phoneNumber) current++;
    if (selectedDate) current++;
    if (selectedTime) current++;
    if (selectedService) current++;
    setStep(current);
    setProgress((current / 5) * 100);
  }, [fullName, phoneNumber, selectedDate, selectedTime, selectedService]);

  useEffect(() => {
    if (submitted && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // تحقق الحقول المطلوبة
    if (
      !fullName ||
      !phoneNumber ||
      !selectedDate ||
      !selectedTime ||
      !selectedService
    ) {
      alert(t("fill_required_fields"));
      return;
    }

    // حاول أخذ FCM
    let fcmToken = "";
    try {
      const messaging = getMessaging(app);
      fcmToken = await getToken(messaging, {
        vapidKey:
          "BMSKYpj6OfL2RinVjw4jUNlL-Hbi1Ev4eiTibIKlvFwqSULUm42ricVJRcKbptmiepuDbl3andf-F2tf7Cmr-U8",
      });
    } catch (err) {
      console.warn("FCM token error", err);
    }

    // تنظيف رقم الهاتف للأرقام فقط
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    // رقم محظور؟
    if (await isPhoneBlocked(cleanPhone)) {
      alert("🚫 هذا الرقم محظور من الحجز. يرجى التواصل مع الحلاق.");
      return;
    }

    // لديه حجوزات سابقة؟
    if (await hasExistingBookings(cleanPhone)) {
      const confirmNew = window.confirm(
        "⚠️ يوجد لديك حجوزات سابقة برقم الهاتف هذا. هل تريد إضافة حجز جديد؟"
      );
      if (!confirmNew) return;
    }

    // تعارض على نفس الساعة؟
    if (await hasActiveConflict(selectedDate, selectedTime)) {
      alert(
        t("time_already_booked") ||
          "هذه الساعة محجوزة بالفعل، يرجى اختيار ساعة أخرى."
      );
      return;
    }

    try {
      // إنشاء كود وتايمستامب
      const bookingCode = Math.random().toString(36).substring(2, 8);
      setCode(bookingCode);
      const bookingDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const timestamp = bookingDateTime.getTime();

      await createBooking({
        fullName,
        phoneNumber: cleanPhone,
        selectedDate,
        selectedTime,
        selectedService,
        bookingCode,
        timestamp,
        reminderSent_60: false,
        reminderSent_30: false,
        fcmToken,
      });

      // نجاح
      setSubmitted(true);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 16000);

      // إعادة ضبط النموذج
      setForm({
        fullName: "",
        phoneNumber: "",
        selectedDate: "",
        selectedTime: "",
        selectedService: "",
      });
    } catch (err) {
      console.error("createBooking error:", err);
      alert("حدث خطأ أثناء حفظ الحجز، يرجى المحاولة لاحقًا.");
    }
  };

  return {
    handleSubmit,
    submitted,
    showSuccessMessage,
    setShowSuccessMessage,
    code,
    step,
    progress,
    messageRef,
  };
}
