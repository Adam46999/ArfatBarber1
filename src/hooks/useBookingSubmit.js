// src/hooks/useBookingSubmit.js
import { useState, useEffect, useRef } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { app, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

import {
  isPhoneBlocked,
  hasExistingBookings,
  hasActiveConflict,
  createBooking,
  fetchActiveBookingsByDate,
} from "../services/bookingService";

import { toILPhoneE164, isILPhoneE164 } from "../utils/phone";

export default function useBookingSubmit(form, setForm, t) {
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const messageRef = useRef(null);
  const submittingRef = useRef(false);

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

    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
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

      const phoneE164 = toILPhoneE164(phoneNumber);
      if (!isILPhoneE164(phoneE164)) {
        alert(t("invalid_phone") || "رقم الهاتف غير صالح");
        return;
      }

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

      if (await isPhoneBlocked(phoneE164)) {
        alert("🚫 هذا الرقم محظور من الحجز. يرجى التواصل مع الحلاق.");
        return;
      }

      let limitOnePerDay = false;
      try {
        const settingsRef = doc(db, "barberSettings", "global");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          limitOnePerDay =
            typeof data.limitOneBookingPerDayPerPhone === "boolean"
              ? data.limitOneBookingPerDayPerPhone
              : !!data.limitOneBookingPerDay;
        }
      } catch (err) {
        console.warn("limitOnePerDay settings read error:", err);
      }

      if (limitOnePerDay) {
        try {
          const dayBookings = await fetchActiveBookingsByDate(selectedDate);
          const hasSameDay = dayBookings.some(
            (b) => b.phoneNumber === phoneE164,
          );

          if (hasSameDay) {
            alert(
              t("phone_already_booked_today") ||
                "لديك حجز مسبق لهذا اليوم بهذا الرقم. إذا أردت تعديل الحجز، يرجى التواصل مع الحلاق.",
            );
            return;
          }
        } catch (err) {
          console.warn("same-day booking check error:", err);
        }
      }

      if (await hasExistingBookings(phoneE164)) {
        const confirmNew = window.confirm(
          "⚠️ يوجد لديك حجوزات سابقة برقم الهاتف هذا. هل تريد إضافة حجز جديد؟",
        );
        if (!confirmNew) return;
      }

      if (await hasActiveConflict(selectedDate, selectedTime)) {
        alert(
          t("time_already_booked") ||
            "هذه الساعة محجوزة بالفعل، يرجى اختيار ساعة أخرى.",
        );
        return;
      }

      const bookingCode = Math.random().toString(36).substring(2, 8);
      setCode(bookingCode);

      const bookingDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const timestamp = bookingDateTime.getTime();

      await createBooking({
        fullName,
        phoneNumber: phoneE164,
        selectedDate,
        selectedTime,
        selectedService,
        bookingCode,
        timestamp,
        reminderSent_60: false,
        reminderSent_30: false,
        fcmToken,
      });

      setSubmitted(true);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 16000);

      setForm({
        fullName: "",
        phoneNumber: "",
        selectedDate: "",
        selectedTime: "",
        selectedService: "",
      });
    } catch (err) {
      console.error("createBooking error:", err);

      if (err?.message === "TIME_ALREADY_BOOKED") {
        alert(
          t("time_already_booked") ||
            "هذه الساعة محجوزة بالفعل، يرجى اختيار ساعة أخرى.",
        );
      } else {
        alert("حدث خطأ أثناء حفظ الحجز، يرجى المحاولة لاحقًا.");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    isSubmitting,
    submitted,
    showSuccessMessage,
    setShowSuccessMessage,
    code,
    step,
    progress,
    messageRef,
  };
}
