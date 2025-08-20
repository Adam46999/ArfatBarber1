// src/components/booking/BookingSection.jsx
import OpeningStatusCard from "./parts/OpeningStatusCard";
import SuccessModal from "./parts/SuccessModal";
import ServiceSelector from "./parts/ServiceSelector";
import TimeSelector from "./parts/TimeSelector";
import DateField from "./parts/DateField";
import workingHours from "./workingHours";
import SectionTitle from "../common/SectionTitle";
import ProgressBar from "./parts/ProgressBar";
import UpcomingBookings from "./parts/UpcomingBookings";
import Button from "../ui/Button";

import PhoneInput from "./parts/PhoneInput";

import useAvailableTimes from "../../hooks/useAvailableTimes";
import useBookingSubmit from "../../hooks/useBookingSubmit";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getOpeningStatus } from "../../utils/dateTime";

function BookingSection() {
  const status = getOpeningStatus(workingHours);
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  // حالة النموذج كلها في كائن واحد لسهولة التمرير للهوكات
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    selectedDate: "",
    selectedTime: "",
    selectedService: "",
  });

  const { availableTimes, isDayBlocked, bookings } = useAvailableTimes(
    form.selectedDate,
    workingHours
  );

  const {
    handleSubmit,
    submitted,
    showSuccessMessage,
    setShowSuccessMessage,
    code,
    step,
    progress,
    messageRef,
  } = useBookingSubmit(form, setForm, t);

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

          {/* ✅ شريط التقدم */}
          <ProgressBar progress={progress} step={step} t={t} />

          <form onSubmit={handleSubmit} className="space-y-8" ref={messageRef}>
            {/* الاسم */}
            <div>
              <label className="block text-sm font-semibold text-gold mb-2">
                {t("name")}
              </label>
              <input
                type="text"
                placeholder={t("name")}
                className="w-full p-3 rounded-xl border border-gray-300 focus:border-gold focus:ring-2 focus:ring-gold/40 transition"
                value={form.fullName}
                onChange={(e) =>
                  setForm((s) => ({ ...s, fullName: e.target.value }))
                }
                required
              />
            </div>

            {/* الهاتف */}
            <div>
              <label className="block text-sm font-semibold text-gold mb-2">
                {t("phone")}
              </label>
              <PhoneInput
                value={form.phoneNumber}
                onChange={(val) => setForm((s) => ({ ...s, phoneNumber: val }))}
                placeholder={t("phone")}
              />
            </div>

            {/* التاريخ */}
            {/* التاريخ */}
            <div>
              <label className="block text-sm font-semibold text-gold mb-2">
                {t("choose_date")}
              </label>
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
              />
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
                  {availableTimes.length > 0 ? (
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
                {t("pick_date_first") ||
                  "اختر التاريخ أولًا لعرض الساعات المتاحة."}
              </div>
            )}

            {/* اختيار الخدمة */}
            <div>
              <label className="block text-sm font-semibold text-gold mb-3">
                {t("choose_service")}
              </label>
              <ServiceSelector
                selectedService={form.selectedService}
                onSelect={(id) =>
                  setForm((s) => ({ ...s, selectedService: id }))
                }
                t={t}
              />
            </div>

            {/* زر التأكيد */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-gold to-yellow-400 text-primary font-bold py-3 rounded-xl shadow hover:scale-[1.02] hover:shadow-lg transition"
            >
              {t("confirm_booking")}
            </button>
          </form>

          {/* حجوزاتك الحالية (إن وجدت) */}
          {/* حجوزاتك القادمة فقط */}
          <UpcomingBookings
            bookings={bookings}
            phoneNumber={form.phoneNumber}
            t={t}
            language={i18n.language}
          />
        </div>
      </div>
    </section>
  );
}

export default BookingSection;
