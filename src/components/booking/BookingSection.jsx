// src/components/booking/BookingSection.jsx

import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import OpeningStatusCard from "./parts/OpeningStatusCard";
import SuccessModal from "./parts/SuccessModal";
import ServiceSelector from "./parts/ServiceSelector";
import TimeSelector from "./parts/TimeSelector";
import DateField from "./parts/DateField";
import ProgressBar from "./parts/ProgressBar";
import PhoneInput from "./parts/PhoneInput";

import SectionTitle from "../common/SectionTitle";

import useAvailableTimes from "../../hooks/useAvailableTimes";
import useMonthAvailability from "../../hooks/useMonthAvailability";
import useBookingSubmit from "../../hooks/useBookingSubmit";
import useWeeklyWorkingHours from "../../hooks/useWeeklyWorkingHours";

import { getOpeningStatus } from "../../utils/dateTime";

import {
  toILPhoneE164,
  isILPhoneE164,
  normalizeDigits,
} from "../../utils/phone";

/* =========================================================
   التحقق من الحقول
   ========================================================= */

/**
 * الاسم:
 *
 * - حرفان على الأقل.
 * - يدعم العربية والعبرية والإنجليزية.
 * - يسمح بالمسافة والشرطة وعلامة الاقتباس.
 */
function isNameValid(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedName = value.trim();

  if (normalizedName.length < 2) {
    return false;
  }

  return /^[\p{L}\s'-]{2,}$/u.test(normalizedName);
}

/**
 * الهاتف:
 *
 * نحوله أولًا إلى الصيغة الموحدة:
 * +9725XXXXXXXX
 */
function isPhoneValid(value) {
  const phoneE164 = toILPhoneE164(value);

  return isILPhoneE164(phoneE164);
}

function isDateValid(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimeValid(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isServiceValid(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * فحص النموذج كاملًا.
 */
function validateForm(form) {
  const errors = {};

  if (!isNameValid(form.fullName)) {
    errors.fullName = "invalid_name";
  }

  if (!isPhoneValid(form.phoneNumber)) {
    errors.phoneNumber = "invalid_phone";
  }

  if (!isDateValid(form.selectedDate)) {
    errors.selectedDate = "invalid_date";
  }

  if (!isTimeValid(form.selectedTime)) {
    errors.selectedTime = "invalid_time";
  }

  if (!isServiceValid(form.selectedService)) {
    errors.selectedService = "invalid_service";
  }

  return errors;
}

/* =========================================================
   القيم الأولية
   ========================================================= */

const INITIAL_FORM = {
  fullName: "",
  phoneNumber: "",
  selectedDate: "",
  selectedTime: "",
  selectedService: "",
};

const INITIAL_TOUCHED = {
  fullName: false,
  phoneNumber: false,
  selectedDate: false,
  selectedTime: false,
  selectedService: false,
};

const ALL_TOUCHED = {
  fullName: true,
  phoneNumber: true,
  selectedDate: true,
  selectedTime: true,
  selectedService: true,
};

/**
 * ترتيب الحقول في النموذج.
 *
 * نستخدمه لمعرفة أول خطأ
 * والنزول إليه مباشرة.
 */
const FIELD_ORDER = [
  {
    key: "fullName",
    step: 1,
  },
  {
    key: "phoneNumber",
    step: 2,
  },
  {
    key: "selectedDate",
    step: 3,
  },
  {
    key: "selectedTime",
    step: 4,
  },
  {
    key: "selectedService",
    step: 5,
  },
];

/**
 * ترجمة مع نص احتياطي.
 */
function translate(t, key, fallback, options = {}) {
  const translated = t(key, {
    defaultValue: fallback,
    ...options,
  });

  if (!translated || translated === key) {
    return fallback;
  }

  return translated;
}

/* =========================================================
   المكوّن
   ========================================================= */

function BookingCalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
      <path d="m8.5 15 2 2 4.5-4.5" />
    </svg>
  );
}

function BookingSection() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.resolvedLanguage || i18n.language || "ar";

  const isArabic = currentLanguage.startsWith("ar");

  const isRTL = i18n.dir() === "rtl";

  const fontClass = isArabic ? "font-ar" : "font-body";

  /* =======================================================
     النموذج
     ======================================================= */

  const [form, setForm] = useState({
    ...INITIAL_FORM,
  });

  const [activeStep, setActiveStep] = useState(1);

  /**
   * الشهر الظاهر حاليًا داخل تقويم الحجز.
   */
  const [visibleCalendarMonth, setVisibleCalendarMonth] = useState(
    () => new Date(),
  );

  /**
   * لا نشغّل ملخص الشهر إلا عندما يصل المستخدم للتقويم.
   */
  const [monthAvailabilityEnabled, setMonthAvailabilityEnabled] =
    useState(false);

  const [errors, setErrors] = useState({});

  const [touched, setTouched] = useState({
    ...INITIAL_TOUCHED,
  });

  /**
   * رسالة محلية تظهر عندما يختفي
   * الموعد الذي اختاره المستخدم.
   */
  const [availabilityNotice, setAvailabilityNotice] = useState("");

  /* =======================================================
     ساعات العمل الأسبوعية
     ======================================================= */

  const {
    weeklyHours,
    loading: loadingWeeklyHours,
    error: weeklyHoursError,
    invalidDays,
    isStale: weeklyHoursAreStale,
    retry: retryWeeklyHours,
  } = useWeeklyWorkingHours({
    live: true,
  });

  /**
   * لا نستعمل ساعات افتراضية مؤقتة هنا.
   *
   * weeklyHours تبقى null حتى تنتهي
   * قراءة Firebase بشكل مؤكد.
   */
  const workingHours = weeklyHours;

  /**
   * حالة المحل الآن.
   */
  const openingStatus = useMemo(() => {
    if (!workingHours) {
      return null;
    }

    return getOpeningStatus(workingHours);
  }, [workingHours]);

  /* =======================================================
     المواعيد المتاحة
     ======================================================= */

  const {
    availableTimes,
    isDayBlocked,
    loadingTimes,
    timesReady,
    timesError,
    refreshTimes,
  } = useAvailableTimes(form.selectedDate, workingHours);

  /**
   * ملخص توفر الشهر الظاهر في التقويم.
   *
   * يبدأ فقط عند تفاعل المستخدم مع التقويم
   * حتى لا نضيف قراءات Firebase لزائر لم يصل للحجز.
   */
  const {
    summaryByDate: monthAvailabilityByDate,
    loading: monthAvailabilityLoading,
    ready: monthAvailabilityReady,
    error: monthAvailabilityError,
  } = useMonthAvailability({
    monthDate: visibleCalendarMonth,
    workingHours,
    enabled: monthAvailabilityEnabled,
  });

  /* =======================================================
     إرسال الحجز
     ======================================================= */

  const {
    handleSubmit,
    retrySubmit,
    clearSubmitError,

    isSubmitting,
    submitted,

    showSuccessMessage,
    setShowSuccessMessage,

    code,
    messageRef,

    submitStage,
    submitMessage,
    submitError,

    isOnline,
    successBooking,
  } = useBookingSubmit(form, setForm, t);

  /* =======================================================
     إعادة ضبط واجهة النموذج
     ======================================================= */

  const resetFormUI = () => {
    setForm({
      ...INITIAL_FORM,
    });

    setErrors({});

    setTouched({
      ...INITIAL_TOUCHED,
    });

    setAvailabilityNotice("");

    setActiveStep(1);

    clearSubmitError();
  };

  /* =======================================================
     تحقق حي من الحقول
     ======================================================= */

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setErrors(validateForm(form));
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form]);

  /* =======================================================
     عند نجاح الحجز
     ======================================================= */

  useEffect(() => {
    if (!showSuccessMessage) {
      return;
    }

    setErrors({});

    setTouched({
      ...INITIAL_TOUCHED,
    });

    setAvailabilityNotice("");

    setActiveStep(6);
  }, [showSuccessMessage]);

  /* =======================================================
     إذا أصبح الموعد المختار غير متاح
     ======================================================= */

  useEffect(() => {
    /**
     * لا نفحص قبل اكتمال تحميل
     * كل بيانات اليوم.
     */
    if (
      !form.selectedDate ||
      !form.selectedTime ||
      loadingTimes ||
      !timesReady ||
      timesError ||
      isDayBlocked
    ) {
      return;
    }

    const selectedTimeStillAvailable = availableTimes.includes(
      form.selectedTime,
    );

    if (selectedTimeStillAvailable) {
      return;
    }

    /**
     * نمسح الساعة فقط.
     *
     * الاسم والهاتف والتاريخ والخدمة
     * تبقى كما هي.
     */
    setForm((currentForm) => ({
      ...currentForm,
      selectedTime: "",
    }));

    setTouched((currentTouched) => ({
      ...currentTouched,
      selectedTime: false,
    }));

    setAvailabilityNotice(
      translate(
        t,
        "selected_time_no_longer_available",
        "الموعد الذي اخترته لم يعد متاحًا. اختر ساعة أخرى، وباقي معلوماتك ما زالت محفوظة.",
      ),
    );

    setActiveStep(4);
  }, [
    availableTimes,
    form.selectedDate,
    form.selectedTime,
    isDayBlocked,
    loadingTimes,
    timesError,
    timesReady,
    t,
  ]);

  /* =======================================================
     تحديث المواعيد عند الرجوع إلى الصفحة
     ======================================================= */

  useEffect(() => {
    if (!form.selectedDate) {
      return undefined;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshTimes();
      }
    };

    const refreshWhenFocused = () => {
      refreshTimes();
    };

    const refreshWhenOnline = () => {
      refreshTimes();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);

    window.addEventListener("focus", refreshWhenFocused);

    window.addEventListener("online", refreshWhenOnline);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);

      window.removeEventListener("focus", refreshWhenFocused);

      window.removeEventListener("online", refreshWhenOnline);
    };
  }, [form.selectedDate, refreshTimes]);

  /* =======================================================
     حالات الحقول
     ======================================================= */

  const fieldState = (key) => {
    const fieldHasError = Boolean(errors[key]);

    const fieldWasTouched = Boolean(touched[key]);

    const value = String(form[key] || "");

    return {
      isInvalid: fieldHasError && fieldWasTouched,

      isValid: !fieldHasError && fieldWasTouched && value.length > 0,
    };
  };

  /**
   * هل النموذج ناقص أو يحتوي خطأ؟
   *
   * لا نستعمل هذه القيمة لتعطيل الزر،
   * حتى يستطيع المستخدم الضغط ويحصل
   * على توضيح مباشر لأول حقل ناقص.
   */
  const hasFormErrors = useMemo(() => {
    return Object.keys(validateForm(form)).length > 0;
  }, [form]);

  /**
   * خطوات شريط التقدم.
   */
  const completed = useMemo(
    () => ({
      name: isNameValid(form.fullName),

      phone: isPhoneValid(form.phoneNumber),

      date: isDateValid(form.selectedDate),

      time: isTimeValid(form.selectedTime),

      service: isServiceValid(form.selectedService),

      confirm: submitted,
    }),

    [
      form.fullName,
      form.phoneNumber,
      form.selectedDate,
      form.selectedTime,
      form.selectedService,
      submitted,
    ],
  );

  /* =======================================================
     النزول إلى أول خطأ
     ======================================================= */

  const scrollToFirstError = (currentErrors) => {
    for (const field of FIELD_ORDER) {
      if (!currentErrors[field.key]) {
        continue;
      }

      setActiveStep(field.step);

      const element = document.getElementById(`field-${field.key}`);

      element?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      break;
    }
  };

  /* =======================================================
     تحديث الحقول
     ======================================================= */

  const updateFormField = (fieldName, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));

    /**
     * عندما يبدأ المستخدم بتعديل النموذج
     * نخفي رسالة الخطأ القديمة.
     */
    if (submitError && submitError.code !== "BOOKING_RESULT_UNKNOWN") {
      clearSubmitError();
    }
  };

  /* =======================================================
     إرسال النموذج بعد التحقق
     ======================================================= */

  const handleFormSubmit = (event) => {
    event.preventDefault();

    setTouched({
      ...ALL_TOUCHED,
    });

    const currentErrors = validateForm(form);

    setErrors(currentErrors);

    /**
     * نوضح أول حقل ناقص بدل أن يشعر
     * المستخدم أن الزر لا يعمل.
     */
    if (Object.keys(currentErrors).length > 0) {
      scrollToFirstError(currentErrors);

      return;
    }

    /**
     * ساعات العمل لم تنتهِ من التحميل.
     */
    if (loadingWeeklyHours || !workingHours) {
      return;
    }

    /**
     * المواعيد لم تنتهِ من التحميل
     * أو حدث خطأ في قراءتها.
     */
    if (loadingTimes || timesError || isDayBlocked) {
      setActiveStep(4);

      return;
    }

    setActiveStep(6);

    void handleSubmit({
      preventDefault() {},
    });
  };

  /* =======================================================
     هل النظام يمنع الإرسال مؤقتًا؟
     ======================================================= */

  const bookingSystemUnavailable =
    isSubmitting ||
    !isOnline ||
    loadingWeeklyHours ||
    !workingHours ||
    Boolean(form.selectedDate && (loadingTimes || timesError || isDayBlocked));

  /* =======================================================
     نص زر الحجز
     ======================================================= */

  const submitButtonText = (() => {
    if (!isSubmitting) {
      return translate(t, "confirm_booking", "تأكيد الحجز");
    }

    if (submitStage === "checking") {
      return translate(t, "checking_booking", "جاري التحقق من الحجز...");
    }

    if (submitStage === "verifying") {
      return translate(t, "verifying_booking", "جاري التحقق من النتيجة...");
    }

    return translate(t, "saving_booking", "جاري تثبيت الحجز...");
  })();

  /* =======================================================
     شكل رسالة الإرسال
     ======================================================= */

  const submitMessageClasses = (() => {
    if (submitStage === "error" || submitStage === "offline") {
      return "border-red-200/80 bg-gradient-to-r from-red-50 via-[#fff9f7] to-red-50 text-red-900 shadow-[0_10px_26px_rgba(127,29,29,0.08)]";
    }

    if (submitStage === "success") {
      return "border-emerald-200 " + "bg-emerald-50 " + "text-emerald-800";
    }

    return "border-[#d8bd74]/55 bg-gradient-to-r from-[#fff9e8] via-[#fffdf7] to-[#fbf1d6] text-[#715619] shadow-[0_10px_26px_rgba(128,94,22,0.10)]";
  })();

  return (
    <section
      id="booking"
      dir={isRTL ? "rtl" : "ltr"}
      className={[
        "border-t border-[#c8a34d]/10 bg-gradient-to-b from-[#f8f6f1] via-[#f6f2e9] to-[#efe9de]",
        "text-primary",
        "py-16",
        "px-4",
        fontClass,
      ].join(" ")}
    >
      <div className="mx-auto max-w-xl">
        <SectionTitle icon={<BookingCalendarIcon />}>{translate(t, "book_now", "احجز الآن")}</SectionTitle>

        {/* ===============================================
            حالة الإنترنت
            =============================================== */}

        {!isOnline && (
          <div
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
            role="alert"
          >
            <p className="text-sm font-bold text-red-800">
              لا يوجد اتصال بالإنترنت
            </p>

            <p className="mt-1 text-xs leading-5 text-red-700">
              معلوماتك لن تُمسح. يمكنك متابعة الحجز فور عودة الاتصال.
            </p>
          </div>
        )}

        {/* ===============================================
            ساعات العمل
            =============================================== */}

        <div className="mb-8">
          {loadingWeeklyHours && !workingHours ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 shadow-sm">
              <div className="flex items-center justify-center gap-3">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent"
                  aria-hidden="true"
                />

                <p className="text-sm font-semibold text-slate-600">
                  جاري تحميل ساعات العمل...
                </p>
              </div>
            </div>
          ) : weeklyHoursError && !workingHours ? (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-center"
              role="alert"
            >
              <p className="text-sm font-bold text-red-800">
                تعذر تحميل ساعات العمل
              </p>

              <p className="mt-2 text-xs leading-5 text-red-700">
                لم نعرض أي مواعيد غير مؤكدة. افحص اتصال الإنترنت ثم حاول مرة
                أخرى.
              </p>

              <button
                type="button"
                onClick={retryWeeklyHours}
                className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : workingHours ? (
            <>
              <OpeningStatusCard
                status={openingStatus}
                workingHours={workingHours}
              />

              {weeklyHoursError && (
                <div
                  className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                  role="status"
                >
                  <p className="text-xs font-semibold leading-5 text-amber-900">
                    {weeklyHoursAreStale
                      ? "نعرض آخر ساعات عمل تم تحميلها بنجاح. يمكنك إعادة التحديث للتأكد."
                      : invalidDays.length > 0
                        ? "بعض أيام العمل تحتوي إعدادات غير مكتملة، لذلك لن نعرض مواعيد غير مؤكدة في هذه الأيام."
                        : "حدثت مشكلة بسيطة أثناء تحديث ساعات العمل."}
                  </p>

                  <button
                    type="button"
                    onClick={retryWeeklyHours}
                    className="mt-2 text-xs font-bold text-amber-900 underline underline-offset-2"
                  >
                    تحديث ساعات العمل
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div id="booking-form-start" />

        <div className="space-y-6 rounded-[28px] border border-[#c8a34d]/20 bg-gradient-to-b from-white via-[#fffdf9] to-[#faf6ed] p-5 shadow-[0_24px_70px_rgba(31,24,12,0.14)] ring-1 ring-white/80 sm:p-8">
          {/* =============================================
              نافذة نجاح الحجز
              ============================================= */}

          <SuccessModal
            visible={submitted && showSuccessMessage}
            onClose={() => {
              setShowSuccessMessage(false);

              resetFormUI();
            }}
            code={code}
            booking={successBooking}
            t={t}
          />

          {/* =============================================
              شريط التقدم
              ============================================= */}

          <ProgressBar
            step={activeStep}
            completed={completed}
            labels={[
              translate(t, "name", "الاسم"),

              translate(t, "phone", "الهاتف"),

              translate(t, "choose_date", "التاريخ"),

              translate(t, "choose_time", "الساعة"),

              translate(t, "choose_service", "الخدمة"),

              translate(t, "confirm_booking", "التأكيد"),
            ]}
          />

          <form
            onSubmit={handleFormSubmit}
            className="space-y-8"
            ref={messageRef}
            noValidate
          >
            {/* ===========================================
                الاسم
                =========================================== */}

            <div id="field-fullName">
              <label
                htmlFor="booking-full-name"
                className="mb-2 block text-sm font-semibold text-gold"
              >
                {translate(t, "name", "الاسم")}
              </label>

              {(() => {
                const { isInvalid, isValid } = fieldState("fullName");

                return (
                  <input
                    id="booking-full-name"
                    type="text"
                    placeholder={translate(t, "name", "الاسم")}
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) => {
                      updateFormField("fullName", event.target.value);
                    }}
                    onBlur={() => {
                      setTouched((currentTouched) => ({
                        ...currentTouched,
                        fullName: true,
                      }));
                    }}
                    onFocus={() => {
                      setActiveStep(1);
                    }}
                    aria-invalid={isInvalid ? "true" : "false"}
                    aria-describedby={isInvalid ? "err-fullName" : undefined}
                    className={[
                      "w-full",
                      "min-h-[50px] rounded-[14px] bg-white/90 px-4 py-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]",
                      "border",
                      "outline-none",
                      "transition",
                      "focus:ring-2",

                      isInvalid
                        ? "border-red-500 focus:ring-red-300"
                        : isValid
                          ? "border-emerald-500 focus:ring-emerald-300"
                          : "border-[#d9d3c6] hover:border-[#c8a34d]/55 focus:border-[#c8a34d] focus:ring-[#c8a34d]/25",
                    ].join(" ")}
                  />
                );
              })()}

              {touched.fullName && errors.fullName && (
                <p
                  id="err-fullName"
                  className="mt-1 text-xs font-medium text-red-500"
                >
                  {translate(
                    t,
                    errors.fullName,
                    "أدخل اسمًا صحيحًا من حرفين على الأقل.",
                  )}
                </p>
              )}
            </div>

            {/* ===========================================
                الهاتف
                =========================================== */}

            <div id="field-phoneNumber">
              <label
                htmlFor="booking-phone"
                className="mb-2 block text-sm font-semibold text-gold"
              >
                {translate(t, "phone", "رقم الهاتف")}
              </label>

              <div
                onFocusCapture={() => {
                  setActiveStep(2);
                }}
              >
                <PhoneInput
                  id="booking-phone"
                  value={form.phoneNumber}
                  onChange={(value) => {
                    updateFormField("phoneNumber", normalizeDigits(value));
                  }}
                  onBlur={() => {
                    setTouched((currentTouched) => ({
                      ...currentTouched,
                      phoneNumber: true,
                    }));
                  }}
                  placeholder={translate(t, "phone", "رقم الهاتف")}
                  inputMode="numeric"
                  autoComplete="tel"
                  enterKeyHint="done"
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !isPhoneValid(form.phoneNumber)
                    ) {
                      event.preventDefault();
                    }
                  }}
                  isValid={isPhoneValid(form.phoneNumber)}
                  isInvalid={
                    touched.phoneNumber && !isPhoneValid(form.phoneNumber)
                  }
                  aria-invalid={
                    touched.phoneNumber && !isPhoneValid(form.phoneNumber)
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched.phoneNumber && !isPhoneValid(form.phoneNumber)
                      ? "err-phone"
                      : undefined
                  }
                />

                {touched.phoneNumber && !isPhoneValid(form.phoneNumber) && (
                  <p
                    id="err-phone"
                    className="mt-1 text-xs font-medium text-red-500"
                  >
                    {translate(
                      t,
                      "invalid_phone",
                      "أدخل رقم هاتف محمول صحيحًا.",
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* ===========================================
                التاريخ
                =========================================== */}

            <div id="field-selectedDate">
              <label className="mb-2 block text-sm font-semibold text-gold">
                {translate(t, "choose_date", "اختر التاريخ")}
              </label>

              <div
                onFocusCapture={() => {
                  setActiveStep(3);
                  setMonthAvailabilityEnabled(true);
                }}
              >
                <DateField
                  valueYMD={form.selectedDate}
                  workingHours={workingHours}
                  onVisibleMonthChange={setVisibleCalendarMonth}
                  availabilityByDate={monthAvailabilityByDate}
                  availabilityReady={monthAvailabilityReady}
                  availabilityLoading={monthAvailabilityLoading}
                  availabilityError={monthAvailabilityError}
                  onChangeYMD={(selectedDate) => {
                    setForm((currentForm) => ({
                      ...currentForm,

                      selectedDate,

                      /**
                       * نعيد اختيار الساعة
                       * لأن ساعات اليوم الجديد مختلفة.
                       */
                      selectedTime: "",
                    }));

                    setAvailabilityNotice("");

                    setTouched((currentTouched) => ({
                      ...currentTouched,

                      selectedDate: true,

                      selectedTime: false,
                    }));

                    clearSubmitError();

                    setActiveStep(3);
                  }}
                  t={t}
                  onBlur={() => {
                    setTouched((currentTouched) => ({
                      ...currentTouched,
                      selectedDate: true,
                    }));
                  }}
                  aria-invalid={
                    touched.selectedDate && errors.selectedDate
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched.selectedDate && errors.selectedDate
                      ? "err-date"
                      : undefined
                  }
                />
              </div>

              {touched.selectedDate && errors.selectedDate && (
                <p
                  id="err-date"
                  className="mt-1 text-xs font-medium text-red-500"
                >
                  {translate(t, errors.selectedDate, "اختر تاريخ الحجز.")}
                </p>
              )}
            </div>

            {/* ===========================================
                الساعة
                =========================================== */}

            <div id="field-selectedTime">
              <label className="mb-3 block text-sm font-semibold text-gold">
                {translate(t, "choose_time", "اختر الساعة")}
              </label>

              {!form.selectedDate ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
                  {translate(
                    t,
                    "pick_date_first",
                    "اختر التاريخ أولًا لعرض المواعيد المتاحة.",
                  )}
                </div>
              ) : loadingWeeklyHours || !workingHours ? (
                <div
                  className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-6"
                  role="status"
                >
                  <div
                    className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent"
                    aria-hidden="true"
                  />

                  <span className="text-sm font-medium text-slate-600">
                    جاري تحميل ساعات العمل...
                  </span>
                </div>
              ) : loadingTimes || !timesReady ? (
                <div
                  className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-6"
                  role="status"
                >
                  <div
                    className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent"
                    aria-hidden="true"
                  />

                  <span className="text-sm font-medium text-slate-600">
                    {translate(
                      t,
                      "loading_times",
                      "جاري تحميل المواعيد المتاحة...",
                    )}
                  </span>
                </div>
              ) : timesError ? (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center"
                  role="alert"
                >
                  <p className="text-sm font-bold text-red-800">
                    تعذر تحميل المواعيد
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    لم نعرض ساعات غير مؤكدة. معلوماتك ما زالت محفوظة.
                  </p>

                  <button
                    type="button"
                    onClick={refreshTimes}
                    className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : isDayBlocked ? (
                <div
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center"
                  role="status"
                >
                  <p className="text-sm font-bold text-amber-900">
                    {translate(
                      t,
                      "no_hours",
                      "لا توجد مواعيد متاحة في هذا اليوم.",
                    )}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    {translate(
                      t,
                      "choose_another_day",
                      "اختر يومًا آخر لمشاهدة المواعيد المتاحة.",
                    )}
                  </p>
                </div>
              ) : (
                <div
                  onFocusCapture={() => {
                    setActiveStep(4);
                  }}
                >
                  <TimeSelector
                    selectedDate={form.selectedDate}
                    selectedTime={form.selectedTime}
                    onSelectTime={(selectedTime) => {
                      updateFormField("selectedTime", selectedTime);

                      setTouched((currentTouched) => ({
                        ...currentTouched,
                        selectedTime: true,
                      }));

                      setAvailabilityNotice("");

                      setActiveStep(4);
                    }}
                    availableTimes={availableTimes}
                    workingHours={workingHours}
                    t={t}
                  />
                </div>
              )}

              {availabilityNotice && (
                <div
                  className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                  role="alert"
                >
                  <p className="text-xs font-semibold leading-5 text-amber-900">
                    {availabilityNotice}
                  </p>
                </div>
              )}

              {touched.selectedTime &&
                errors.selectedTime &&
                !loadingTimes &&
                !timesError &&
                !isDayBlocked && (
                  <p
                    id="err-time"
                    className="mt-2 text-xs font-medium text-red-500"
                  >
                    {translate(t, errors.selectedTime, "اختر ساعة الحجز.")}
                  </p>
                )}
            </div>

            {/* ===========================================
                الخدمة
                =========================================== */}

            <div id="field-selectedService">
              <label className="mb-3 block text-sm font-semibold text-gold">
                {translate(t, "choose_service", "اختر الخدمة")}
              </label>

              <div
                onFocusCapture={() => {
                  setActiveStep(5);
                }}
              >
                <ServiceSelector
                  selectedService={form.selectedService}
                  onSelect={(serviceId) => {
                    updateFormField("selectedService", serviceId);

                    setTouched((currentTouched) => ({
                      ...currentTouched,
                      selectedService: true,
                    }));

                    setActiveStep(5);
                  }}
                  rtl={isRTL}
                />
              </div>

              {touched.selectedService && errors.selectedService && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {translate(
                    t,
                    errors.selectedService,
                    "اختر الخدمة المطلوبة.",
                  )}
                </p>
              )}
            </div>

            {/* ===========================================
                حالة عملية الحجز
                =========================================== */}

            {submitMessage && submitStage !== "success" && (
              <div
                className={[
                  "rounded-[18px]",
                  "border",
                  "px-4 sm:px-5",
                  "py-4 sm:py-[18px]",
                  submitMessageClasses,
                ].join(" ")}
                role={
                  submitStage === "error" || submitStage === "offline"
                    ? "alert"
                    : "status"
                }
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  {isSubmitting && (
                    <div
                      className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-6">
                      {submitMessage}
                    </p>

                    {submitError?.retryable && !isSubmitting && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={retrySubmit}
                          disabled={!isOnline}
                          className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {translate(t, "retry", "إعادة المحاولة")}
                        </button>

                        <button
                          type="button"
                          onClick={clearSubmitError}
                          className="rounded-xl border border-current px-4 py-2 text-xs font-bold transition hover:bg-white/50"
                        >
                          {translate(t, "close_message", "إغلاق الرسالة")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===========================================
                زر تأكيد الحجز
                =========================================== */}

            <button
              type="submit"
              disabled={bookingSystemUnavailable}
              aria-busy={isSubmitting ? "true" : "false"}
              className={[
                "w-full min-h-[54px] touch-manipulation",
                "rounded-[16px]",
                "px-5 py-3.5",
                "font-extrabold tracking-[0.01em]",
                "shadow-[0_12px_28px_rgba(128,94,22,0.20)]",
                "outline-none transition-[filter,box-shadow,border-color] duration-200 focus-visible:ring-4 focus-visible:ring-[#c8a34d]/25",

                bookingSystemUnavailable
                  ? "cursor-not-allowed border border-[#ddd6c8] bg-[#e9e5dc] text-[#8a857b] shadow-none"
                  : "border border-[#b98b32]/70 bg-gradient-to-r from-[#b98b32] via-[#e0c36e] to-[#c49b43] text-[#171717] hover:brightness-[1.04] hover:shadow-[0_15px_34px_rgba(128,94,22,0.26)]",

                hasFormErrors && !bookingSystemUnavailable
                  ? "ring-1 ring-amber-300"
                  : "",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isSubmitting && (
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                )}

                <span>{submitButtonText}</span>
              </span>
            </button>

            {!isSubmitting && hasFormErrors && (
              <p className="text-center text-xs font-medium text-slate-500">
                {translate(t, "missing_fields_hint", "اضغط تأكيد الحجز وسنوضح لك أي معلومة ناقصة.")}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default BookingSection;
