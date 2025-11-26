// src/hooks/useBookingSubmit.js
import { useState, useEffect, useRef } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { app, db } from "../firebase"; // 👈 أضفنا db هنا
import { doc, getDoc } from "firebase/firestore"; // 👈 نقرأ إعداد من Firestore مباشرة

import {
  isPhoneBlocked,
  hasExistingBookings,
  hasActiveConflict,
  createBooking,
  fetchActiveBookingsByDate, // 👈 نستخدم فانكشن موجودة أصلاً
} from "../services/bookingService";

import { toILPhoneE164, isILPhoneE164 } from "../utils/phone";

export default function useBookingSubmit(form, setForm, t) {
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [code, setCode] = useState("");
  const messageRef = useRef(null);

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

    // تطبيع الهاتف لصيغة E.164
    const phoneE164 = toILPhoneE164(phoneNumber);
    if (!isILPhoneE164(phoneE164)) {
      alert(t("invalid_phone") || "رقم الهاتف غير صالح");
      return;
    }

    // FCM (اختياري)
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

    // محظور؟
    if (await isPhoneBlocked(phoneE164)) {
      alert("🚫 هذا الرقم محظور من الحجز. يرجى التواصل مع الحلاق.");
      return;
    }

    // ⚙️ قراءة إعداد "حجز واحد لكل رقم في اليوم" مباشرة من Firestore
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
      // لو في خطأ ما نمنع الحجز عشان ما نخرب التجربة
    }

    if (limitOnePerDay) {
      // نجيب كل حجوزات هذا اليوم، ثم نتحقق إذا هذا الرقم عنده حجز فعّال
      try {
        const dayBookings = await fetchActiveBookingsByDate(selectedDate);
        const hasSameDay = dayBookings.some((b) => b.phoneNumber === phoneE164);
        if (hasSameDay) {
          alert(
            t("phone_already_booked_today") ||
              "لديك حجز مسبق لهذا اليوم بهذا الرقم. إذا أردت تعديل الحجز، يرجى التواصل مع الحلاق."
          );
          return;
        }
      } catch (err) {
        console.warn("same-day booking check error:", err);
        // لو صار خطأ في التحقق، ما نمنع الحجز
      }
    }

    // لديه حجوزات سابقة؟ (أي يوم) – نفس السلوك القديم
    if (await hasExistingBookings(phoneE164)) {
      const confirmNew = window.confirm(
        "⚠️ يوجد لديك حجوزات سابقة برقم الهاتف هذا. هل تريد إضافة حجز جديد؟"
      );
      if (!confirmNew) return;
    }

    // تعارض نفس الوقت؟
    if (await hasActiveConflict(selectedDate, selectedTime)) {
      alert(
        t("time_already_booked") ||
          "هذه الساعة محجوزة بالفعل، يرجى اختيار ساعة أخرى."
      );
      return;
    }

    try {
      const bookingCode = Math.random().toString(36).substring(2, 8);
      setCode(bookingCode);
      const bookingDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const timestamp = bookingDateTime.getTime();

      await createBooking({
        fullName,
        phoneNumber: phoneE164, // نخزّن دائمًا E.164
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
