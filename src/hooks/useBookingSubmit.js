// src/hooks/useBookingSubmit.js

import { useCallback, useEffect, useRef, useState } from "react";

import { getMessaging, getToken } from "firebase/messaging";

import { doc, getDoc } from "firebase/firestore";

import { app, db } from "../firebase";

import {
  attachFcmTokenToBooking,
  createBooking,
  fetchActiveBookingsByDate,
  getBookingByRequestId,
  hasActiveConflict,
  hasExistingBookings,
  isPhoneBlocked,
  logBookingClientEvent,
} from "../services/bookingService";

import { isILPhoneE164, toILPhoneE164 } from "../utils/phone";

/**
 * مفتاح حفظ محاولة الحجز على جهاز المستخدم.
 */
const PENDING_ATTEMPT_KEY = "arfat_pending_booking_attempt_v1";

/**
 * نحذف محاولة الحجز القديمة بعد 24 ساعة.
 */
const ATTEMPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * المدة التي ننتظرها قبل الانتقال
 * إلى فحص نتيجة الحجز.
 */
const CREATE_TIMEOUT_MS = 15_000;

/**
 * عدد مرات فحص هل الحجز انحفظ بعد البطء.
 */
const RECOVERY_TRIES = 4;

/**
 * المدة بين كل فحص وفحص.
 */
const RECOVERY_DELAY_MS = 1_500;

const EMPTY_FORM = {
  fullName: "",
  phoneNumber: "",
  selectedDate: "",
  selectedTime: "",
  selectedService: "",
};

/**
 * انتظار لمدة معينة.
 */
function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * إرجاع الترجمة إذا كانت موجودة،
 * وإلا استعمال النص الاحتياطي.
 */
function getMessage(t, key, fallback) {
  if (typeof t !== "function") {
    return fallback;
  }

  const translated = t(key);

  return translated && translated !== key ? translated : fallback;
}

/**
 * إنشاء رقم ثابت لمحاولة الحجز.
 */
function createRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return ["booking", Date.now(), Math.random().toString(36).slice(2, 14)].join(
    "_",
  );
}

/**
 * إنشاء كود حجز واضح وقوي.
 *
 * لا نستعمل أحرفًا قد تلتبس:
 * I / L / O / 0 / 1
 */
function createBookingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const values = new Uint32Array(6);

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * alphabet.length);
    }
  }

  return Array.from(
    values,

    (value) => alphabet[value % alphabet.length],
  ).join("");
}

/**
 * قراءة محاولة الحجز المحفوظة.
 */
function readPendingAttempt() {
  try {
    const raw = localStorage.getItem(PENDING_ATTEMPT_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    const createdAtMs = Number(parsed?.createdAtMs || 0);

    if (!parsed?.requestId || !createdAtMs) {
      localStorage.removeItem(PENDING_ATTEMPT_KEY);

      return null;
    }

    const attemptAge = Date.now() - createdAtMs;

    if (attemptAge > ATTEMPT_MAX_AGE_MS) {
      localStorage.removeItem(PENDING_ATTEMPT_KEY);

      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("Pending booking attempt read failed:", error);

    localStorage.removeItem(PENDING_ATTEMPT_KEY);

    return null;
  }
}

/**
 * حفظ محاولة الحجز على الجهاز.
 */
function writePendingAttempt(attempt) {
  try {
    localStorage.setItem(PENDING_ATTEMPT_KEY, JSON.stringify(attempt));
  } catch (error) {
    console.warn("Pending booking attempt write failed:", error);
  }
}

/**
 * حذف محاولة الحجز.
 */
function clearPendingAttempt(requestId = "") {
  try {
    if (!requestId) {
      localStorage.removeItem(PENDING_ATTEMPT_KEY);

      return;
    }

    const current = readPendingAttempt();

    if (!current || current.requestId === requestId) {
      localStorage.removeItem(PENDING_ATTEMPT_KEY);
    }
  } catch (error) {
    console.warn("Pending booking attempt clear failed:", error);
  }
}

/**
 * فحص هل المعلومات الحالية
 * هي نفس محاولة الحجز السابقة.
 */
function sameAttempt(attempt, values) {
  return (
    attempt?.fullName === values.fullName &&
    attempt?.phoneNumber === values.phoneNumber &&
    attempt?.selectedDate === values.selectedDate &&
    attempt?.selectedTime === values.selectedTime &&
    attempt?.selectedService === values.selectedService
  );
}

/**
 * إضافة مهلة زمنية إلى Promise.
 */
function withTimeout(promise, timeoutMs) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(
      () => {
        reject(new Error("BOOKING_TIMEOUT"));
      },

      timeoutMs,
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

/**
 * البحث عدة مرات عن الحجز.
 *
 * يُستخدم عندما يتأخر الرد،
 * لأن الحجز قد يكون انحفظ فعلًا.
 */
async function findCreatedBooking(requestId, tries = RECOVERY_TRIES) {
  for (let attemptNumber = 0; attemptNumber < tries; attemptNumber += 1) {
    const booking = await getBookingByRequestId(requestId);

    if (booking) {
      return booking;
    }

    const hasMoreTries = attemptNumber < tries - 1;

    if (hasMoreTries) {
      await sleep(RECOVERY_DELAY_MS);
    }
  }

  return null;
}

/**
 * قراءة إعداد:
 * حجز واحد لكل هاتف في اليوم.
 */
async function readLimitOnePerDaySetting() {
  const settingsRef = doc(db, "barberSettings", "global");

  const settingsSnapshot = await getDoc(settingsRef);

  if (!settingsSnapshot.exists()) {
    return false;
  }

  const data = settingsSnapshot.data() || {};

  if (typeof data.limitOneBookingPerDayPerPhone === "boolean") {
    return data.limitOneBookingPerDayPerPhone;
  }

  return Boolean(data.limitOneBookingPerDay);
}

/**
 * تجهيز الإشعارات بعد نجاح الحجز.
 *
 * لا ننتظر هذه العملية،
 * لذلك فشل الإشعار لا يمنع الحجز.
 */
function startNotificationSetup(bookingId, requestId, bookingDetails) {
  if (!bookingId) {
    return;
  }

  void (async () => {
    try {
      const messaging = getMessaging(app);

      const fcmToken = await getToken(
        messaging,

        {
          vapidKey:
            "BMSKYpj6OfL2RinVjw4jUNlL-Hbi1Ev4eiTibIKlvFwqSULUm42ricVJRcKbptmiepuDbl3andf-F2tf7Cmr-U8",
        },
      );

      if (!fcmToken) {
        return;
      }

      await attachFcmTokenToBooking(bookingId, fcmToken);
    } catch (error) {
      console.warn("FCM setup skipped:", error);

      logBookingClientEvent({
        type: "FCM_TOKEN_FAILED",

        stage: "notifications",

        requestId,

        selectedDate: bookingDetails.selectedDate,

        selectedTime: bookingDetails.selectedTime,

        errorCode: error?.code || error?.message || "FCM_FAILED",
      });
    }
  })();
}

export default function useBookingSubmit(form, setForm, t) {
  const [submitted, setSubmitted] = useState(false);

  const [showSuccessMessage, setShowSuccessMessageState] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [code, setCode] = useState("");

  const [step, setStep] = useState(0);

  const [progress, setProgress] = useState(0);

  /**
   * المراحل الممكنة:
   *
   * idle
   * checking
   * saving
   * verifying
   * success
   * error
   * offline
   */
  const [submitStage, setSubmitStage] = useState("idle");

  const [submitMessage, setSubmitMessage] = useState("");

  const [submitError, setSubmitError] = useState(null);

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  /**
   * تفاصيل آخر حجز ناجح.
   *
   * سنستعملها في ملف
   * BookingSection لعرض التفاصيل
   * حتى بعد تنظيف النموذج.
   */
  const [successBooking, setSuccessBooking] = useState(null);

  const messageRef = useRef(null);

  const submittingRef = useRef(false);

  const mountedRef = useRef(true);

  const slowTimerRef = useRef(null);

  const successTimerRef = useRef(null);

  const activeRequestIdRef = useRef("");

  const { fullName, phoneNumber, selectedDate, selectedTime, selectedService } =
    form;

  /**
   * إيقاف مؤقت رسالة الاتصال البطيء.
   */
  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);

      slowTimerRef.current = null;
    }
  }, []);

  /**
   * إيقاف مؤقت نافذة النجاح.
   */
  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);

      successTimerRef.current = null;
    }
  }, []);

  /**
   * إغلاق أو فتح نافذة النجاح.
   */
  const setShowSuccessMessage = useCallback(
    (nextValue) => {
      const visible = Boolean(nextValue);

      setShowSuccessMessageState(visible);

      if (!visible) {
        clearSuccessTimer();

        clearPendingAttempt(activeRequestIdRef.current);
      }
    },

    [clearSuccessTimer],
  );

  /**
   * عرض نجاح الحجز.
   */
  const showBookingSuccess = useCallback(
    (booking, requestId) => {
      if (!mountedRef.current) {
        return;
      }

      const bookingCode = booking?.bookingCode || "";

      activeRequestIdRef.current =
        requestId || booking?.requestId || booking?.id || "";

      setCode(bookingCode);

      setSuccessBooking(booking);

      setSubmitted(true);

      setShowSuccessMessageState(true);

      setSubmitStage("success");

      setSubmitMessage(
        getMessage(t, "booking_success", "تم تثبيت حجزك بنجاح."),
      );

      setSubmitError(null);

      clearSuccessTimer();

      successTimerRef.current = window.setTimeout(
        () => {
          if (!mountedRef.current) {
            return;
          }

          setShowSuccessMessageState(false);

          clearPendingAttempt(activeRequestIdRef.current);
        },

        16_000,
      );
    },

    [clearSuccessTimer, t],
  );

  /**
   * تنظيف رسالة الخطأ.
   */
  const clearSubmitError = useCallback(() => {
    setSubmitError(null);

    setSubmitMessage("");

    setSubmitStage("idle");
  }, []);

  /**
   * تنظيف المؤقتات عند مغادرة الصفحة.
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      clearSlowTimer();

      clearSuccessTimer();
    };
  }, [clearSlowTimer, clearSuccessTimer]);

  /**
   * متابعة حالة الإنترنت.
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);

      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /**
   * حساب نسبة تعبئة النموذج.
   */
  useEffect(() => {
    let current = 0;

    if (fullName) {
      current += 1;
    }

    if (phoneNumber) {
      current += 1;
    }

    if (selectedDate) {
      current += 1;
    }

    if (selectedTime) {
      current += 1;
    }

    if (selectedService) {
      current += 1;
    }

    setStep(current);

    setProgress((current / 5) * 100);
  }, [fullName, phoneNumber, selectedDate, selectedTime, selectedService]);

  /**
   * النزول إلى رسالة النجاح.
   */
  useEffect(() => {
    if (submitted && messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [submitted]);

  /**
   * عند فتح الصفحة:
   *
   * نفحص هل كانت هناك محاولة حجز
   * نجحت قبل أن يخرج المستخدم.
   */
  useEffect(() => {
    let cancelled = false;

    const recoverPendingAttempt = async () => {
      const pendingAttempt = readPendingAttempt();

      if (!pendingAttempt?.requestId) {
        return;
      }

      try {
        const existingBooking = await getBookingByRequestId(
          pendingAttempt.requestId,
        );

        if (cancelled || !existingBooking) {
          return;
        }

        showBookingSuccess(existingBooking, pendingAttempt.requestId);
      } catch (error) {
        console.warn("Pending booking recovery skipped:", error);
      }
    };

    void recoverPendingAttempt();

    return () => {
      cancelled = true;
    };
  }, [showBookingSuccess]);

  /**
   * تنفيذ الحجز.
   */
  const handleSubmit = useCallback(
    async (event) => {
      event?.preventDefault?.();

      /**
       * منع الضغط المتكرر.
       */
      if (submittingRef.current) {
        return;
      }

      setSubmitError(null);

      const trimmedName = String(fullName || "").trim();

      const phoneE164 = toILPhoneE164(phoneNumber);

      /**
       * فحص الحقول المطلوبة.
       */
      if (
        !trimmedName ||
        !phoneNumber ||
        !selectedDate ||
        !selectedTime ||
        !selectedService
      ) {
        const message = getMessage(
          t,
          "fill_required_fields",
          "يرجى تعبئة جميع الحقول المطلوبة.",
        );

        setSubmitStage("error");

        setSubmitMessage(message);

        setSubmitError({
          code: "MISSING_FIELDS",

          message,

          retryable: false,
        });

        return;
      }

      /**
       * فحص الهاتف.
       */
      if (!isILPhoneE164(phoneE164)) {
        const message = getMessage(t, "invalid_phone", "رقم الهاتف غير صالح.");

        setSubmitStage("error");

        setSubmitMessage(message);

        setSubmitError({
          code: "INVALID_PHONE",

          message,

          retryable: false,
        });

        return;
      }

      /**
       * لا نحاول الحجز بدون إنترنت.
       */
      if (!navigator.onLine) {
        const message =
          "لا يوجد اتصال بالإنترنت. معلوماتك محفوظة، حاول بعد عودة الاتصال.";

        setSubmitStage("offline");

        setSubmitMessage(message);

        setSubmitError({
          code: "OFFLINE",

          message,

          retryable: true,
        });

        return;
      }

      const normalizedValues = {
        fullName: trimmedName,

        phoneNumber: phoneE164,

        selectedDate,

        selectedTime,

        selectedService,
      };

      /**
       * إذا كانت نفس المحاولة السابقة،
       * نستعمل نفس requestId ونفس الكود.
       */
      const previousAttempt = readPendingAttempt();

      const reusableAttempt = sameAttempt(previousAttempt, normalizedValues)
        ? previousAttempt
        : null;

      const requestId = reusableAttempt?.requestId || createRequestId();

      const bookingCode = reusableAttempt?.bookingCode || createBookingCode();

      const createdAtMs = reusableAttempt?.createdAtMs || Date.now();

      const startedAtMs = Date.now();

      const pendingAttempt = {
        ...normalizedValues,

        requestId,

        bookingCode,

        createdAtMs,

        status: "submitting",
      };

      writePendingAttempt(pendingAttempt);

      activeRequestIdRef.current = requestId;

      submittingRef.current = true;

      setIsSubmitting(true);

      setSubmitStage("checking");

      setSubmitMessage("جاري التحقق من بيانات الحجز والموعد...");

      clearSlowTimer();

      /**
       * إذا استغرق الفحص أكثر من 6 ثوانٍ،
       * نوضح أن الاتصال بطيء.
       */
      slowTimerRef.current = window.setTimeout(
        () => {
          if (!mountedRef.current || !submittingRef.current) {
            return;
          }

          setSubmitMessage(
            "الاتصال بطيء قليلًا، لا تغلق الصفحة. ما زلنا نتحقق من الحجز.",
          );
        },

        6_000,
      );

      logBookingClientEvent({
        type: "BOOKING_SUBMIT_STARTED",

        stage: "checking",

        requestId,

        selectedDate,

        selectedTime,
      });

      try {
        /**
         * قبل أي شيء:
         * نفحص هل هذه المحاولة نجحت سابقًا.
         */
        const existingAttemptBooking = await getBookingByRequestId(requestId);

        if (existingAttemptBooking) {
          showBookingSuccess(existingAttemptBooking, requestId);

          setForm({
            ...EMPTY_FORM,
          });

          return;
        }

        /**
         * تشغيل الفحوصات المستقلة معًا
         * بدل انتظار كل واحدة منفصلة.
         *
         * هذا يسرّع الحجز.
         */
        const [blocked, limitOnePerDay, existingBookings, activeConflict] =
          await Promise.all([
            isPhoneBlocked(phoneE164),

            readLimitOnePerDaySetting(),

            hasExistingBookings(phoneE164),

            hasActiveConflict(selectedDate, selectedTime),
          ]);

        /**
         * الرقم محظور.
         */
        if (blocked) {
          const message = "هذا الرقم محظور من الحجز. يرجى التواصل مع الحلاق.";

          setSubmitStage("error");

          setSubmitMessage(message);

          setSubmitError({
            code: "PHONE_BLOCKED",

            message,

            retryable: false,
          });

          clearPendingAttempt(requestId);

          return;
        }

        /**
         * فحص حجز واحد في اليوم.
         */
        if (limitOnePerDay) {
          const dayBookings = await fetchActiveBookingsByDate(selectedDate);

          const hasSameDayBooking = dayBookings.some(
            (booking) => booking.phoneNumber === phoneE164,
          );

          if (hasSameDayBooking) {
            const message = getMessage(
              t,

              "phone_already_booked_today",

              "لديك حجز مسبق لهذا اليوم بهذا الرقم. إذا أردت تعديل الحجز، يرجى التواصل مع الحلاق.",
            );

            setSubmitStage("error");

            setSubmitMessage(message);

            setSubmitError({
              code: "PHONE_ALREADY_BOOKED_TODAY",

              message,

              retryable: false,
            });

            clearPendingAttempt(requestId);

            return;
          }
        }

        /**
         * المحافظة على تأكيد:
         * يوجد لديك حجز سابق.
         */
        if (existingBookings) {
          const confirmNewBooking = window.confirm(
            "يوجد لديك حجز سابق برقم الهاتف هذا. هل تريد إضافة حجز جديد؟",
          );

          if (!confirmNewBooking) {
            setSubmitStage("idle");

            setSubmitMessage("");

            clearPendingAttempt(requestId);

            return;
          }
        }

        /**
         * الموعد أصبح محجوزًا.
         */
        if (activeConflict) {
          const message = getMessage(
            t,

            "time_already_booked",

            "هذا الموعد أصبح محجوزًا للتو. اختر موعدًا آخر.",
          );

          /**
           * نمسح الساعة فقط.
           * باقي المعلومات تبقى.
           */
          setForm((currentForm) => ({
            ...currentForm,

            selectedTime: "",
          }));

          setSubmitStage("error");

          setSubmitMessage(message);

          setSubmitError({
            code: "TIME_ALREADY_BOOKED",

            message,

            retryable: false,
          });

          clearPendingAttempt(requestId);

          return;
        }

        const bookingDateTime = new Date(`${selectedDate}T${selectedTime}:00`);

        const timestamp = bookingDateTime.getTime();

        if (Number.isNaN(timestamp)) {
          throw new Error("INVALID_BOOKING_DATE_TIME");
        }

        const bookingPayload = {
          ...normalizedValues,

          requestId,

          bookingCode,

          createdAtMs,

          timestamp,

          reminderSent_60: false,

          reminderSent_30: false,
        };

        setCode(bookingCode);

        setSubmitStage("saving");

        setSubmitMessage("جاري تثبيت الحجز...");

        let bookingId;

        try {
          /**
           * تثبيت الحجز مع مهلة زمنية.
           */
          bookingId = await withTimeout(
            createBooking(bookingPayload),

            CREATE_TIMEOUT_MS,
          );
        } catch (error) {
          /**
           * خطأ عادي من Firebase.
           */
          if (error?.message !== "BOOKING_TIMEOUT") {
            throw error;
          }

          /**
           * انتهت المهلة.
           *
           * لا نعلن الفشل مباشرة،
           * بل نفحص هل الحجز انحفظ.
           */
          setSubmitStage("verifying");

          setSubmitMessage(
            "الاتصال بطيء، نتحقق الآن إن كان الحجز قد تم حتى لا يتكرر.",
          );

          writePendingAttempt({
            ...pendingAttempt,

            status: "verifying",
          });

          const recoveredBooking = await findCreatedBooking(requestId);

          /**
           * لم نستطع معرفة النتيجة بعد.
           *
           * نبقي نفس requestId،
           * لذلك إعادة المحاولة آمنة.
           */
          if (!recoveredBooking) {
            const message =
              "لم نستطع تأكيد النتيجة بعد. معلوماتك محفوظة؛ اضغط إعادة المحاولة، ولن ننشئ حجزًا مكررًا.";

            setSubmitStage("error");

            setSubmitMessage(message);

            setSubmitError({
              code: "BOOKING_RESULT_UNKNOWN",

              message,

              retryable: true,
            });

            writePendingAttempt({
              ...pendingAttempt,

              status: "unknown",
            });

            logBookingClientEvent({
              type: "BOOKING_RESULT_UNKNOWN",

              stage: "verifying",

              requestId,

              selectedDate,

              selectedTime,

              durationMs: Date.now() - startedAtMs,
            });

            return;
          }

          /**
           * وجدنا الحجز بعد البطء.
           */
          bookingId = recoveredBooking.id;

          showBookingSuccess(recoveredBooking, requestId);

          setForm({
            ...EMPTY_FORM,
          });

          startNotificationSetup(bookingId, requestId, normalizedValues);

          logBookingClientEvent({
            type: "BOOKING_RECOVERED_AFTER_TIMEOUT",

            stage: "success",

            requestId,

            selectedDate,

            selectedTime,

            durationMs: Date.now() - startedAtMs,
          });

          return;
        }

        /**
         * نجاح مباشر.
         */
        const savedBooking = {
          id: bookingId,

          ...bookingPayload,
        };

        writePendingAttempt({
          ...pendingAttempt,

          status: "success",

          bookingId,
        });

        showBookingSuccess(savedBooking, requestId);

        /**
         * تنظيف النموذج فقط بعد
         * نجاح الحجز المؤكد.
         */
        setForm({
          ...EMPTY_FORM,
        });

        /**
         * تجهيز الإشعارات بعد النجاح.
         */
        startNotificationSetup(bookingId, requestId, normalizedValues);

        logBookingClientEvent({
          type: "BOOKING_CREATED",

          stage: "success",

          requestId,

          selectedDate,

          selectedTime,

          durationMs: Date.now() - startedAtMs,
        });
      } catch (error) {
        console.error("createBooking error:", error);

        const errorCode = error?.code || error?.message || "BOOKING_FAILED";

        /**
         * شخص آخر حجز الموعد
         * أثناء تنفيذ Transaction.
         */
        if (error?.message === "TIME_ALREADY_BOOKED") {
          const message = getMessage(
            t,

            "time_already_booked",

            "هذا الموعد أصبح محجوزًا للتو. اختر موعدًا آخر.",
          );

          setForm((currentForm) => ({
            ...currentForm,

            selectedTime: "",
          }));

          setSubmitStage("error");

          setSubmitMessage(message);

          setSubmitError({
            code: "TIME_ALREADY_BOOKED",

            message,

            retryable: false,
          });

          clearPendingAttempt(requestId);
        } else if (error?.message === "REQUEST_ID_CONFLICT") {
          const message =
            "تعذر متابعة محاولة الحجز السابقة بأمان. أعد اختيار الموعد ثم حاول مرة أخرى.";

          setSubmitStage("error");

          setSubmitMessage(message);

          setSubmitError({
            code: "REQUEST_ID_CONFLICT",

            message,

            retryable: false,
          });

          clearPendingAttempt(requestId);
        } else {
          /**
           * خطأ اتصال أو Firebase.
           *
           * لا نمسح أي معلومة.
           */
          const message = navigator.onLine
            ? "تعذر إكمال الحجز حاليًا. معلوماتك ما زالت محفوظة، اضغط إعادة المحاولة."
            : "انقطع الإنترنت أثناء الحجز. معلوماتك محفوظة، حاول بعد عودة الاتصال.";

          setSubmitStage(navigator.onLine ? "error" : "offline");

          setSubmitMessage(message);

          setSubmitError({
            code: errorCode,

            message,

            retryable: true,
          });

          writePendingAttempt({
            ...pendingAttempt,

            status: "failed",
          });
        }

        logBookingClientEvent({
          type: "BOOKING_FAILED",

          stage: "submit",

          requestId,

          selectedDate,

          selectedTime,

          errorCode,

          durationMs: Date.now() - startedAtMs,
        });
      } finally {
        clearSlowTimer();

        submittingRef.current = false;

        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },

    [
      clearSlowTimer,
      fullName,
      phoneNumber,
      selectedDate,
      selectedService,
      selectedTime,
      setForm,
      showBookingSuccess,
      t,
    ],
  );

  /**
   * إعادة محاولة آمنة.
   *
   * تستعمل نفس requestId إذا كانت
   * المعلومات لم تتغير.
   */
  const retrySubmit = useCallback(() => {
    void handleSubmit({
      preventDefault() {},
    });
  }, [handleSubmit]);

  return {
    handleSubmit,

    retrySubmit,

    clearSubmitError,

    isSubmitting,

    submitted,

    showSuccessMessage,

    setShowSuccessMessage,

    code,

    step,

    progress,

    messageRef,

    submitStage,

    submitMessage,

    submitError,

    isOnline,

    successBooking,
  };
}
