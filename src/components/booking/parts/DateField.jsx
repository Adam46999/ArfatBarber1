// src/components/booking/parts/DateField.jsx

import { useTranslation } from "react-i18next";
import DatePicker, { registerLocale } from "react-datepicker";
import { ar, enUS, he } from "date-fns/locale";

import "react-datepicker/dist/react-datepicker.css";

registerLocale("ar", ar);
registerLocale("he", he);
registerLocale("en", enUS);

function parseYMD(valueYMD) {
  if (!valueYMD) return null;

  const [year, month, day] = valueYMD.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatYMD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function DateField({
  valueYMD,
  onChangeYMD,
  onBlur,
  t,
  ...accessibilityProps
}) {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.resolvedLanguage || i18n.language || "ar";
  const language = currentLanguage.startsWith("he")
    ? "he"
    : currentLanguage.startsWith("en")
      ? "en"
      : "ar";

  const isRTL = language === "ar" || language === "he";
  const selectedDate = parseYMD(valueYMD);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSunday = (date) => date.getDay() === 0;

  const getDayClassName = (date) => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const isToday = normalizedDate.getTime() === today.getTime();
    const isPast = normalizedDate < today;
    const isClosed = isSunday(date);

    const classes = [];

    if (isToday) {
      classes.push("booking-calendar__day--today");
    }

    if (isPast || isClosed) {
      classes.push("booking-calendar__day--unavailable");
    }

    return classes.join(" ");
  };

  const handleChange = (date) => {
    if (!date) {
      onChangeYMD("");
      onBlur?.();
      return;
    }

    onChangeYMD(formatYMD(date));
    onBlur?.();
  };

  return (
    <div
      className={`booking-calendar-wrapper ${
        isRTL ? "booking-calendar-wrapper--rtl" : ""
      }`}
      dir={isRTL ? "rtl" : "ltr"}
      {...accessibilityProps}
    >
      <DatePicker
        inline
        selected={selectedDate}
        onChange={handleChange}
        minDate={today}
        filterDate={(date) => !isSunday(date)}
        locale={language}
        calendarStartDay={language === "en" ? 0 : 1}
        dayClassName={getDayClassName}
        calendarClassName="booking-inline-calendar"
        previousMonthButtonLabel={
          t?.("previous_month") ||
          (language === "en" ? "Previous month" : "الشهر السابق")
        }
        nextMonthButtonLabel={
          t?.("next_month") ||
          (language === "en" ? "Next month" : "الشهر التالي")
        }
        ariaLabelledBy="booking-date-label"
      />

      <style>{`
        .booking-calendar-wrapper {
          width: 100%;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #ffffff;
          box-shadow:
            0 10px 28px rgba(15, 23, 42, 0.06),
            0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .booking-calendar-wrapper .react-datepicker {
          width: 100%;
          border: 0;
          border-radius: 18px;
          background: transparent;
          font-family: inherit;
          color: #172033;
        }

        .booking-calendar-wrapper .react-datepicker__month-container {
          width: 100%;
          float: none;
        }

        .booking-calendar-wrapper .react-datepicker__header {
          padding: 16px 12px 10px;
          border-bottom: 1px solid #f0f1f3;
          border-radius: 18px 18px 0 0;
          background: linear-gradient(
            180deg,
            rgba(250, 246, 234, 0.95) 0%,
            rgba(255, 255, 255, 1) 100%
          );
        }

        .booking-calendar-wrapper .react-datepicker__current-month {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 42px;
          color: #172033;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.4;
        }

        .booking-calendar-wrapper .react-datepicker__navigation {
          top: 15px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e8e4da;
          border-radius: 11px;
          background: #ffffff;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.06);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background-color 160ms ease;
        }

        .booking-calendar-wrapper
          .react-datepicker__navigation:hover {
          transform: scale(1.04);
          border-color: #caa94d;
          background: #fffaf0;
        }

        .booking-calendar-wrapper
          .react-datepicker__navigation--previous {
          left: 12px;
        }

        .booking-calendar-wrapper
          .react-datepicker__navigation--next {
          right: 12px;
        }

        .booking-calendar-wrapper--rtl
          .react-datepicker__navigation--previous {
          left: auto;
          right: 12px;
        }

        .booking-calendar-wrapper--rtl
          .react-datepicker__navigation--next {
          right: auto;
          left: 12px;
        }

        .booking-calendar-wrapper
          .react-datepicker__navigation-icon::before {
          top: 10px;
          width: 8px;
          height: 8px;
          border-color: #8a6b1f;
          border-width: 2px 2px 0 0;
        }

        .booking-calendar-wrapper .react-datepicker__day-names,
        .booking-calendar-wrapper .react-datepicker__week {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          width: 100%;
          gap: 4px;
          margin: 0;
        }

        .booking-calendar-wrapper .react-datepicker__day-names {
          margin-top: 12px;
        }

        .booking-calendar-wrapper .react-datepicker__day-name {
          width: auto;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          color: #7a7f89;
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
        }

        .booking-calendar-wrapper .react-datepicker__month {
          margin: 0;
          padding: 10px 10px 14px;
        }

        .booking-calendar-wrapper .react-datepicker__week {
          margin-bottom: 4px;
        }

        .booking-calendar-wrapper .react-datepicker__day {
          width: auto;
          aspect-ratio: 1;
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          border: 1px solid transparent;
          border-radius: 12px;
          color: #252b38;
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          transition:
            transform 150ms ease,
            color 150ms ease,
            border-color 150ms ease,
            background-color 150ms ease,
            box-shadow 150ms ease;
        }

        .booking-calendar-wrapper
          .react-datepicker__day:not(
            .react-datepicker__day--disabled,
            .react-datepicker__day--selected
          ):hover {
          transform: translateY(-1px);
          border-color: rgba(202, 169, 77, 0.5);
          background: #fff8e8;
          color: #6f5311;
        }

        .booking-calendar-wrapper
          .react-datepicker__day--keyboard-selected:not(
            .react-datepicker__day--selected
          ) {
          background: transparent;
          color: inherit;
        }

        .booking-calendar-wrapper .react-datepicker__day--selected,
        .booking-calendar-wrapper
          .react-datepicker__day--selected:hover {
          border-color: #b58a26;
          background: linear-gradient(135deg, #d3ad4d, #f0cf72);
          color: #172033;
          box-shadow: 0 7px 16px rgba(181, 138, 38, 0.28);
          transform: translateY(-1px);
        }

        .booking-calendar-wrapper .booking-calendar__day--today:not(
            .react-datepicker__day--selected
          ) {
          position: relative;
          border-color: #caa94d;
          color: #8a6717;
          background: #fffaf0;
        }

        .booking-calendar-wrapper
          .booking-calendar__day--today:not(
            .react-datepicker__day--selected
          )::after {
          content: "";
          position: absolute;
          bottom: 4px;
          left: 50%;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #b58a26;
          transform: translateX(-50%);
        }

        .booking-calendar-wrapper .react-datepicker__day--disabled,
        .booking-calendar-wrapper
          .booking-calendar__day--unavailable {
          cursor: not-allowed;
          border-color: transparent;
          background: #f5f5f5;
          color: #b8bbc2;
          text-decoration: line-through;
          box-shadow: none;
          opacity: 0.72;
        }

        .booking-calendar-wrapper
          .react-datepicker__day--outside-month {
          color: #d0d2d7;
          opacity: 0.55;
        }

        .booking-calendar-wrapper
          .react-datepicker__day--outside-month.react-datepicker__day--disabled {
          visibility: hidden;
        }

        .booking-calendar-wrapper .react-datepicker__aria-live {
          position: absolute;
        }

        @media (min-width: 480px) {
          .booking-calendar-wrapper .react-datepicker__header {
            padding: 18px 16px 12px;
          }

          .booking-calendar-wrapper .react-datepicker__month {
            padding: 12px 16px 18px;
          }

          .booking-calendar-wrapper .react-datepicker__day-names,
          .booking-calendar-wrapper .react-datepicker__week {
            gap: 7px;
          }

          .booking-calendar-wrapper .react-datepicker__day {
            min-height: 44px;
            font-size: 14px;
          }

          .booking-calendar-wrapper .react-datepicker__day-name {
            font-size: 12px;
          }
        }

        @media (max-width: 360px) {
          .booking-calendar-wrapper .react-datepicker__month {
            padding-inline: 7px;
          }

          .booking-calendar-wrapper .react-datepicker__day-names,
          .booking-calendar-wrapper .react-datepicker__week {
            gap: 2px;
          }

          .booking-calendar-wrapper .react-datepicker__day {
            min-height: 34px;
            border-radius: 10px;
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .booking-calendar-wrapper *,
          .booking-calendar-wrapper *::before,
          .booking-calendar-wrapper *::after {
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DateField;
