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

function ArrowIcon({ direction }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {direction === "right" ? (
        <path d="m9 18 6-6-6-6" />
      ) : (
        <path d="m15 18-6-6 6-6" />
      )}
    </svg>
  );
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

    const classes = [];

    if (normalizedDate.getTime() === today.getTime()) {
      classes.push("booking-calendar__today");
    }

    if (normalizedDate < today) {
      classes.push("booking-calendar__past");
    }

    if (isSunday(date)) {
      classes.push("booking-calendar__closed");
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

  const getMonthLabel = (date) =>
    new Intl.DateTimeFormat(language, {
      month: "long",
      year: "numeric",
    }).format(date);

  return (
    <div
      className="booking-calendar-wrapper"
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
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="booking-calendar-header">
            <button
              type="button"
              onClick={isRTL ? increaseMonth : decreaseMonth}
              disabled={
                isRTL ? nextMonthButtonDisabled : prevMonthButtonDisabled
              }
              className="booking-calendar-header__button"
              aria-label={
                isRTL
                  ? t?.("next_month") || "الشهر التالي"
                  : t?.("previous_month") || "الشهر السابق"
              }
            >
              <ArrowIcon direction="left" />
            </button>

            <div className="booking-calendar-header__title">
              {getMonthLabel(date)}
            </div>

            <button
              type="button"
              onClick={isRTL ? decreaseMonth : increaseMonth}
              disabled={
                isRTL ? prevMonthButtonDisabled : nextMonthButtonDisabled
              }
              className="booking-calendar-header__button"
              aria-label={
                isRTL
                  ? t?.("previous_month") || "الشهر السابق"
                  : t?.("next_month") || "الشهر التالي"
              }
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        )}
      />

      <style>{`
        .booking-calendar-wrapper {
          width: 100%;
          overflow: hidden;
          border: 1px solid #d7cbb7;
          border-radius: 17px;
          background: #f7f2e8;
          box-shadow:
            0 14px 30px rgba(57, 43, 18, 0.10),
            0 3px 8px rgba(57, 43, 18, 0.05);
        }

        .booking-calendar-wrapper .react-datepicker {
          width: 100%;
          border: 0;
          border-radius: 17px;
          background: #f7f2e8;
          color: #172033;
          font-family: inherit;
        }

        .booking-calendar-wrapper .react-datepicker__month-container {
          width: 100%;
          float: none;
        }

        .booking-calendar-wrapper .react-datepicker__header {
          padding: 0 10px 9px;
          border-bottom: 1px solid #ded2bf;
          border-radius: 17px 17px 0 0;
          background: linear-gradient(
            180deg,
            #eee3cf 0%,
            #f7f2e8 100%
          );
        }

        .booking-calendar-header {
          width: 100%;
          min-height: 54px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) 40px;
          align-items: center;
          gap: 8px;
          padding-top: 8px;
        }

        .booking-calendar-header__title {
          overflow: hidden;
          color: #182235;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.4;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .booking-calendar-header__button {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cdbfaa;
          border-radius: 12px;
          background: #fffdf8;
          color: #7b5915;
          box-shadow:
            0 4px 10px rgba(65, 47, 15, 0.09),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition:
            border-color 150ms ease,
            background-color 150ms ease,
            color 150ms ease;
        }

        .booking-calendar-header__button:hover:not(:disabled) {
          border-color: #b98a24;
          background: #f9edcf;
          color: #5e430f;
        }

        .booking-calendar-header__button:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 3px rgba(190, 143, 36, 0.24),
            0 4px 10px rgba(65, 47, 15, 0.09);
        }

        .booking-calendar-header__button:disabled {
          cursor: not-allowed;
          opacity: 0.35;
        }

        .booking-calendar-wrapper .react-datepicker__day-names,
        .booking-calendar-wrapper .react-datepicker__week {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 4px;
          margin: 0;
        }

        .booking-calendar-wrapper .react-datepicker__day-names {
          margin-top: 7px;
        }

        .booking-calendar-wrapper .react-datepicker__day-name {
          width: auto;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          color: #625b50;
          font-size: 10px;
          font-weight: 900;
          line-height: 1;
        }

        .booking-calendar-wrapper .react-datepicker__month {
          margin: 0;
          padding: 9px 9px 13px;
          background: #f7f2e8;
        }

        .booking-calendar-wrapper .react-datepicker__week {
          margin-bottom: 4px;
        }

        .booking-calendar-wrapper .react-datepicker__day {
          width: auto;
          min-width: 0;
          min-height: 40px;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          border: 1px solid #e1d7c7;
          border-radius: 11px;
          background: #fffdf8;
          color: #172033;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
          user-select: none;
          box-shadow: 0 1px 2px rgba(57, 43, 18, 0.03);
          transition:
            border-color 140ms ease,
            background-color 140ms ease,
            color 140ms ease,
            box-shadow 140ms ease;
        }

        .booking-calendar-wrapper
          .react-datepicker__day:not(
            .react-datepicker__day--disabled,
            .react-datepicker__day--selected
          ):hover {
          border-color: #bd8c25;
          background: #f5e5bd;
          color: #5d430f;
          box-shadow: 0 4px 10px rgba(118, 84, 18, 0.10);
        }

        .booking-calendar-wrapper
          .react-datepicker__day--keyboard-selected:not(
            .react-datepicker__day--selected
          ) {
          background: #fffdf8;
          color: #172033;
        }

        .booking-calendar-wrapper .react-datepicker__day--selected,
        .booking-calendar-wrapper
          .react-datepicker__day--selected:hover {
          border-color: #986b0f;
          background: linear-gradient(
            145deg,
            #dcae3f,
            #efcf70
          );
          color: #172033;
          font-weight: 900;
          box-shadow:
            0 9px 18px rgba(145, 98, 12, 0.30),
            inset 0 0 0 1px rgba(255, 255, 255, 0.42);
        }

        .booking-calendar-wrapper
          .booking-calendar__today:not(
            .react-datepicker__day--selected
          ) {
          position: relative;
          border-color: #b68620;
          background: #f4e5bf;
          color: #65480f;
          font-weight: 900;
          box-shadow: inset 0 0 0 1px rgba(182, 134, 32, 0.08);
        }

        .booking-calendar-wrapper
          .booking-calendar__today:not(
            .react-datepicker__day--selected
          )::after {
          content: "";
          position: absolute;
          bottom: 4px;
          left: 50%;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #9c7017;
          transform: translateX(-50%);
        }

        .booking-calendar-wrapper
          .react-datepicker__day--disabled {
          border-color: #e4ddd1;
          background: #e9e5de;
          color: #aaa59d;
          cursor: not-allowed;
          opacity: 1;
          box-shadow: none;
          text-decoration: none;
        }

        .booking-calendar-wrapper .booking-calendar__past {
          border-color: #e5dfd6;
          background: #ebe8e2;
          color: #b5b0a8;
        }

        .booking-calendar-wrapper .booking-calendar__closed {
          position: relative;
          border-color: #dfd8cd;
          background: #e6e2dc;
          color: #99948d;
        }

        .booking-calendar-wrapper .booking-calendar__closed::after {
          content: "";
          position: absolute;
          width: 44%;
          height: 1px;
          border-radius: 999px;
          background: #9d9891;
          transform: rotate(-35deg);
        }

        .booking-calendar-wrapper
          .react-datepicker__day--outside-month {
          visibility: hidden;
          pointer-events: none;
        }

        .booking-calendar-wrapper .react-datepicker__aria-live {
          position: absolute;
        }

        @media (min-width: 420px) {
          .booking-calendar-wrapper .react-datepicker__header {
            padding-inline: 13px;
          }

          .booking-calendar-wrapper .react-datepicker__month {
            padding-inline: 13px;
          }

          .booking-calendar-wrapper .react-datepicker__day-names,
          .booking-calendar-wrapper .react-datepicker__week {
            gap: 6px;
          }

          .booking-calendar-wrapper .react-datepicker__day {
            min-height: 43px;
            font-size: 13px;
          }

          .booking-calendar-wrapper .react-datepicker__day-name {
            font-size: 11px;
          }
        }

        @media (max-width: 350px) {
          .booking-calendar-wrapper .react-datepicker__header {
            padding-inline: 6px;
          }

          .booking-calendar-header {
            grid-template-columns: 36px minmax(0, 1fr) 36px;
          }

          .booking-calendar-header__button {
            width: 36px;
            height: 36px;
          }

          .booking-calendar-wrapper .react-datepicker__month {
            padding-inline: 6px;
          }

          .booking-calendar-wrapper .react-datepicker__day-names,
          .booking-calendar-wrapper .react-datepicker__week {
            gap: 2px;
          }

          .booking-calendar-wrapper .react-datepicker__day {
            min-height: 36px;
            border-radius: 9px;
            font-size: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .booking-calendar-wrapper *,
          .booking-calendar-wrapper *::before,
          .booking-calendar-wrapper *::after {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DateField;
