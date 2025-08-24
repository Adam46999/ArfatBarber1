// src/components/booking/BookingSection.jsx
import OpeningStatusCard from "./parts/OpeningStatusCard";
import SuccessModal from "./parts/SuccessModal";
import ServiceSelector from "./parts/ServiceSelector";
import TimeSelector from "./parts/TimeSelector";
import DateField from "./parts/DateField";
import workingHours from "./workingHours";
import SectionTitle from "../common/SectionTitle";
import ProgressBar from "./parts/ProgressBar";
import PhoneInput from "./parts/PhoneInput";

import useAvailableTimes from "../../hooks/useAvailableTimes";
import useBookingSubmit from "../../hooks/useBookingSubmit";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getOpeningStatus } from "../../utils/dateTime";

/* ===========================
   تحقق احترافي (Inline)
   =========================== */

// اسم: حرفين فأكثر (يسمح بأحرف عربية/لاتينية + مسافات/'-)
const isNameValid = (v) => {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length < 2) return false;
  return /^[\p{L}\s'-]{2,}$/u.test(s);
};

// هاتف: بالضبط 10 أرقام ويبدأ بـ 05
// تحويل الأرقام الشرقية (٠١٢… / ۰۱۲…) إلى ASCII
const easternToAscii = (s = "") =>
  s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // عربية هندية
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)); // فارسية

// تنظيف الإدخال إلى أرقام فقط (من أي نظام أرقام)
const normalizePhone = (v) =>
  easternToAscii(v || "").replace(/[^\p{Nd}]/gu, "");

// يبدأ بـ 05 ومكوّن من 10 أرقام
const isPhoneValid = (v) => /^05\d{8}$/.test(normalizePhone(v));

const isDateValid = (v) => typeof v === "string" && v.trim().length > 0;
const isTimeValid = (v) => typeof v === "string" && v.trim().length > 0;
const isServiceValid = (v) => typeof v === "string" && v.trim().length > 0;

const validateForm = (form) => {
  const errors = {};
  if (!isNameValid(form.fullName)) errors.fullName = "invalid_name";
  if (!isPhoneValid(form.phoneNumber)) errors.phoneNumber = "invalid_phone";
  if (!isDateValid(form.selectedDate)) errors.selectedDate = "invalid_date";
  if (!isTimeValid(form.selectedTime)) errors.selectedTime = "invalid_time";
  if (!isServiceValid(form.selectedService))
    errors.selectedService = "invalid_service";
  return errors;
};

function BookingSection() {
  const status = getOpeningStatus(workingHours);
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  // حالة النموذج كلها في كائن واحد
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    selectedDate: "",
    selectedTime: "",
    selectedService: "",
  });

  // آخر خطوة لمسها المستخدم (لإبراز الأيقونة النشطة)
  const [activeStep, setActiveStep] = useState(1);

  // أخطاء وحقول تم لمسها (UX احترافي)
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({
    fullName: false,
    phoneNumber: false,
    selectedDate: false,
    selectedTime: false,
    selectedService: false,
  });

  const { availableTimes, isDayBlocked, loadingTimes } = useAvailableTimes(
    form.selectedDate,
    workingHours
  );

  // لا نفكّك step/progress من الهوك لتفادي unused
  const {
    handleSubmit,
    submitted,
    showSuccessMessage,
    setShowSuccessMessage,
    code,
    messageRef,
  } = useBookingSubmit(form, setForm, t);

  // تحقق حيّ (debounce خفيف)
  useEffect(() => {
    const id = setTimeout(() => setErrors(validateForm(form)), 150);
    return () => clearTimeout(id);
  }, [form]);

  // مساعد لتلوين الحقول حسب الحالة
  const fieldState = (key) => {
    const invalid = Boolean(errors[key]);
    const wasTouched = touched[key];
    return {
      isInvalid: invalid && wasTouched,
      isValid:
        !invalid && wasTouched && (form[key] || "").toString().length > 0,
    };
  };

  // ✓ مستقلّة لكل خطوة حسب التحقق
  const completed = useMemo(
    () => ({
      name: isNameValid(form.fullName),
      phone: isPhoneValid(form.phoneNumber),
      date: isDateValid(form.selectedDate),
      time: isTimeValid(form.selectedTime),
      service: isServiceValid(form.selectedService),
      // تظهر ✓ على "تأكيد" بعد الإرسال الناجح + كل شيء صحيح
      confirm: submitted && Object.keys(validateForm(form)).length === 0,
    }),
    [form, submitted]
  );

  // بعد الإرسال الناجح نعرض الخطوة النشطة كـ 6 (اختياري)
  useEffect(() => {
    if (submitted) setActiveStep(6);
  }, [submitted]);

  // سكرول لأول خطأ عند محاولة الإرسال
  const scrollToFirstError = () => {
    const keys = [
      "fullName",
      "phoneNumber",
      "selectedDate",
      "selectedTime",
      "selectedService",
    ];
    for (const k of keys) {
      if (errors[k]) {
        const el = document.getElementById(`field-${k}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
    }
  };

  return (
    <section
      id="booking"
      className={`bg-[#f8f8f8] text-primary py-16 px-4 ${fontClass}`}
    >
      <div className="max-w-xl mx-auto">
        <SectionTitle>{t("book_now")}</SectionTitle>

        <div className="mb-8">
          <OpeningStatusCard
            t={t}
            status={status}
            workingHours={workingHours}
          />
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100">
          <SuccessModal
            visible={submitted && showSuccessMessage}
            onClose={() => setShowSuccessMessage(false)}
            code={code}
            t={t}
          />

          {/* ✅ مؤشر بسيط: أيقونات + ✓ مستقلة لكل خطوة (بدون أرقام/بار) */}
          <ProgressBar
            step={activeStep}
            completed={completed}
            labels={[
              t("name"),
              t("phone"),
              t("choose_date"),
              t("choose_time"),
              t("choose_service"),
              t("confirm_booking") || t("confirm"),
            ]}
          />

          <form onSubmit={handleSubmit} className="space-y-8" ref={messageRef}>
            {/* الاسم */}
            <div id="field-fullName">
              <label className="block text-sm font-semibold text-gold mb-2">
                {t("name")}
              </label>
              {(() => {
                const { isInvalid, isValid } = fieldState("fullName");
                return (
                  <input
                    type="text"
                    placeholder={t("name")}
                    className={`w-full p-3 rounded-xl border transition ${
                      isInvalid
                        ? "border-red-500 focus:ring-red-300"
                        : isValid
                        ? "border-emerald-500 focus:ring-emerald-300"
                        : "border-gray-300 focus:border-gold focus:ring-2 focus:ring-gold/40"
                    }`}
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, fullName: e.target.value }))
                    }
                    onBlur={() => setTouched((s) => ({ ...s, fullName: true }))}
                    onFocus={() => setActiveStep(1)}
                    aria-invalid={isInvalid ? "true" : "false"}
                    aria-describedby={isInvalid ? "err-fullName" : undefined}
                    required
                  />
                );
              })()}
              {touched.fullName && errors.fullName && (
                <p id="err-fullName" className="text-red-500 text-xs mt-1">
                  {t(errors.fullName)}
                </p>
              )}
            </div>

            {/* الهاتف */}

            <div id="field-phoneNumber">
              <label className="block text-sm font-semibold text-gold mb-2">
                {t("phone")}
              </label>

              <div onFocusCapture={() => setActiveStep(2)}>
                <PhoneInput
                  value={form.phoneNumber}
                  onChange={(val) =>
                    setForm((s) => ({ ...s, phoneNumber: val }))
                  }
                  // نعتبر الحقل "مَلموس" بعد الخروج منه (لإظهار الأحمر فقط وقتها)
                  onBlur={() =>
                    setTouched((s) => ({ ...s, phoneNumber: true }))
                  }
                  placeholder={t("phone")}
                  inputMode="numeric"
                  pattern="^05\\d{8}$"
                  // ✅ أخضر مباشرة إذا الرقم صحيح (بعد تحويل الشرقية)
                  isValid={isPhoneValid(form.phoneNumber)}
                  // ❌ أحمر فقط بعد اللمس + عدم الصحة
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

                {/* رسالة الخطأ بعد اللمس فقط */}
                {touched.phoneNumber && !isPhoneValid(form.phoneNumber) && (
                  <p id="err-phone" className="text-red-500 text-xs mt-1">
                    {t("invalid_phone")}
                  </p>
                )}

                {/* (اختياري) رسالة نجاح */}
              </div>
            </div>

            {/* التاريخ */}
            <div id="field-selectedDate">
              <label className="block text-sm font-semibold text-gold mb-2">
                {t("choose_date")}
              </label>
              <div onFocusCapture={() => setActiveStep(3)}>
                <DateField
                  valueYMD={form.selectedDate}
                  onChangeYMD={(ymd) =>
                    setForm((s) => ({
                      ...s,
                      selectedDate: ymd,
                      selectedTime: "",
                    }))
                  }
                  t={t}
                  onBlur={() =>
                    setTouched((s) => ({ ...s, selectedDate: true }))
                  }
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
                <p id="err-date" className="text-red-500 text-xs mt-1">
                  {t(errors.selectedDate)}
                </p>
              )}
              {form.selectedDate && isDayBlocked && (
                <p className="text-red-600 font-semibold text-center text-sm mt-2">
                  {t("day_blocked")}
                </p>
              )}
            </div>

            {/* الساعات */}
            {/* الساعات */}
            {form.selectedDate ? (
              isDayBlocked ? (
                <p className="text-red-600 font-semibold text-center text-sm mt-2">
                  {t("day_blocked")}
                </p>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gold mb-3">
                    {t("choose_time")}
                  </label>

                  {/* ✅ هون ييجي الكود اللي شفته بالصورة */}
                  {loadingTimes ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gold border-t-transparent" />
                      <span className="ml-2 text-slate-500 text-sm">
                        {t("loading_times")}
                      </span>
                    </div>
                  ) : availableTimes.length > 0 ? (
                    <TimeSelector
                      selectedDate={form.selectedDate}
                      selectedTime={form.selectedTime}
                      onSelectTime={(time) =>
                        setForm((s) => ({ ...s, selectedTime: time }))
                      }
                      availableTimes={availableTimes}
                      workingHours={workingHours}
                      t={t}
                    />
                  ) : (
                    <p className="text-red-500 text-sm font-medium mt-2">
                      {t("no_hours")}
                    </p>
                  )}
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 bg-gray-50 text-center text-sm text-gray-600">
                {t("pick_date_first")}
              </div>
            )}

            {/* اختيار الخدمة */}
            <div id="field-selectedService">
              <label className="block text-sm font-semibold text-gold mb-3">
                {t("choose_service")}
              </label>
              <div onFocusCapture={() => setActiveStep(5)}>
                <ServiceSelector
                  selectedService={form.selectedService}
                  onSelect={(id) => {
                    setForm((s) => ({ ...s, selectedService: id }));
                    setActiveStep(5);
                  }}
                  t={t}
                  onBlur={() =>
                    setTouched((s) => ({ ...s, selectedService: true }))
                  }
                />
              </div>
              {touched.selectedService && errors.selectedService && (
                <p className="text-red-500 text-xs mt-1">
                  {t(errors.selectedService)}
                </p>
              )}
            </div>

            {/* زر التأكيد */}
            <button
              type="submit"
              onClick={(e) => {
                // علّم كل الحقول كـ touched لإظهار الأخطاء لو فيه
                const allTouched = {
                  fullName: true,
                  phoneNumber: true,
                  selectedDate: true,
                  selectedTime: true,
                  selectedService: true,
                };
                setTouched(allTouched);
                const currentErrors = validateForm(form);
                setErrors(currentErrors);
                if (Object.keys(currentErrors).length > 0) {
                  e.preventDefault();
                  scrollToFirstError();
                }
              }}
              disabled={Object.keys(errors).length > 0}
              className={`w-full font-bold py-3 rounded-xl shadow transition ${
                Object.keys(errors).length > 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-gold to-yellow-400 text-primary hover:scale-[1.02] hover:shadow-lg"
              }`}
            >
              {t("confirm_booking")}
            </button>
          </form>

          {/* حجوزاتك القادمة فقط */}
        </div>
      </div>
    </section>
  );
}

export default BookingSection;
