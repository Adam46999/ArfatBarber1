// src/components/booking/BookingTracker.jsx

import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  LoaderCircle,
  Phone,
  Scissors,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { db } from "../../firebase";
import SectionTitle from "../common/SectionTitle";
import {
  e164ToLocalPretty,
  isILPhoneE164,
  normalizeDigits,
  toILPhoneE164,
} from "../../utils/phone";
import { cancelBooking } from "../../services/bookingService";

const CANCELLATION_WINDOW_MIN = 50;

function diffMinutes(fromDate, toDate) {
  const milliseconds = toDate.getTime() - fromDate.getTime();

  return Math.floor(milliseconds / 60000);
}

function getStartAtDate(booking) {
  if (!booking) return null;

  if (booking?.startAt?.toDate) {
    const date = booking.startAt.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if (booking?.selectedDate && booking?.selectedTime) {
    const date = new Date(`${booking.selectedDate}T${booking.selectedTime}:00`);

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  return null;
}

function isBookingActiveNow(booking) {
  if (!booking || booking.cancelledAt) return false;

  const startAtDate = getStartAtDate(booking);

  if (!startAtDate) return false;

  return startAtDate.getTime() > Date.now();
}

function canCancelFixed(startAtDate) {
  if (!(startAtDate instanceof Date) || Number.isNaN(startAtDate.getTime())) {
    return {
      ok: false,
      reason: "بيانات الموعد غير صالحة.",
    };
  }

  const minutesLeft = diffMinutes(new Date(), startAtDate);

  if (minutesLeft < 0) {
    return {
      ok: false,
      reason: "لا يمكن الإلغاء: موعد الحجز انتهى بالفعل.",
    };
  }

  if (minutesLeft < CANCELLATION_WINDOW_MIN) {
    return {
      ok: false,
      reason: `لا يمكن الإلغاء: تبقّى أقل من ${CANCELLATION_WINDOW_MIN} دقيقة على موعدك.`,
    };
  }

  return { ok: true };
}

function formatDayAndDate(dateYMD) {
  if (!dateYMD) return "";

  const date = new Date(`${dateYMD}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateYMD;
  }

  const weekdayNames = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  const dayName = weekdayNames[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${dayName}، ${day}-${month}-${year}`;
}

function DetailItem({ icon, label, value, featured = false, className = "" }) {
  return (
    <div
      className={[
        "min-w-0 rounded-2xl border p-3.5",
        featured
          ? "border-[#dec47f] bg-[#fff9e9]"
          : "border-slate-200 bg-slate-50",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            featured
              ? "bg-[#f2dda5] text-[#76550f]"
              : "bg-white text-slate-500 shadow-sm",
          ].join(" ")}
        >
          {icon}
        </span>

        <span>{label}</span>
      </div>

      <p
        className={[
          "mt-2 break-words text-sm font-black",
          featured ? "text-[#5e430d]" : "text-slate-900",
        ].join(" ")}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function BookingTracker() {
  const { t } = useTranslation();

  const [phone, setPhone] = useState("");
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [codeInputs, setCodeInputs] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [cancellingId, setCancellingId] = useState("");

  const handlePhoneChange = (event) => {
    setPhone(event.target.value);

    if (notFound) {
      setNotFound(false);
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const handleCheck = async (event) => {
    event?.preventDefault();

    setResults([]);
    setNotFound(false);
    setSuccessMessage("");
    setErrorMessages({});

    const input = phone.trim();

    if (!input) return;

    const localNumber = normalizeDigits(input);
    const phoneE164 = toILPhoneE164(input);
    const hasValidE164 = isILPhoneE164(phoneE164);

    setLoading(true);

    try {
      const bookingsById = {};

      if (hasValidE164) {
        const e164Query = query(
          collection(db, "bookings"),
          where("phoneNumber", "==", phoneE164),
        );

        const e164Snapshot = await getDocs(e164Query);

        e164Snapshot.forEach((document) => {
          bookingsById[document.id] = {
            docId: document.id,
            ...document.data(),
          };
        });
      }

      if (localNumber) {
        const localQuery = query(
          collection(db, "bookings"),
          where("phoneNumber", "==", localNumber),
        );

        const localSnapshot = await getDocs(localQuery);

        localSnapshot.forEach((document) => {
          bookingsById[document.id] = {
            docId: document.id,
            ...document.data(),
          };
        });
      }

      const activeBookings = Object.values(bookingsById)
        .filter(isBookingActiveNow)
        .sort((firstBooking, secondBooking) => {
          const firstDate = getStartAtDate(firstBooking);
          const secondDate = getStartAtDate(secondBooking);

          if (!firstDate && !secondDate) return 0;
          if (!firstDate) return 1;
          if (!secondDate) return -1;

          return firstDate.getTime() - secondDate.getTime();
        });

      if (activeBookings.length === 0) {
        setNotFound(true);
      } else {
        setResults(activeBookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (bookingId, nextCode) => {
    setCodeInputs((previous) => ({
      ...previous,
      [bookingId]: nextCode,
    }));

    if (errorMessages[bookingId]) {
      setErrorMessages((previous) => ({
        ...previous,
        [bookingId]: "",
      }));
    }
  };

  const handleCancel = async (booking) => {
    const code = (codeInputs[booking.docId] || "").trim();

    if (!code || code !== booking.bookingCode) {
      setErrorMessages((previous) => ({
        ...previous,
        [booking.docId]: "رمز التحقق غير صحيح.",
      }));
      return;
    }

    if (!isBookingActiveNow(booking)) {
      setErrorMessages((previous) => ({
        ...previous,
        [booking.docId]: "هذا الحجز لم يعد فعّالًا، ولا يمكن إلغاؤه.",
      }));
      return;
    }

    const startAtDate = getStartAtDate(booking);
    const cancellationCheck = canCancelFixed(startAtDate);

    if (!cancellationCheck.ok) {
      setErrorMessages((previous) => ({
        ...previous,
        [booking.docId]: cancellationCheck.reason,
      }));
      return;
    }

    setCancellingId(booking.docId);

    try {
      await cancelBooking(booking.docId);

      setResults((previous) =>
        previous.filter(
          (currentBooking) => currentBooking.docId !== booking.docId,
        ),
      );

      setSuccessMessage("تم إلغاء الحجز بنجاح.");

      setCodeInputs((previous) => {
        const nextInputs = { ...previous };

        delete nextInputs[booking.docId];

        return nextInputs;
      });
    } catch (error) {
      console.error("Error while cancelling:", error);

      setErrorMessages((previous) => ({
        ...previous,
        [booking.docId]: "حدث خطأ أثناء الإلغاء. حاول مرة أخرى.",
      }));
    } finally {
      setCancellingId("");
    }
  };

  return (
    <section
      id="check-booking"
      dir="rtl"
      className="relative scroll-mt-28 overflow-hidden bg-[#f8f6f1] px-4 py-16 font-body text-primary md:scroll-mt-32 md:py-20"
      style={{ scrollMarginTop: 120 }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <SectionTitle
          icon={
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold shadow-sm">
              <CalendarCheck className="h-6 w-6" aria-hidden="true" />
            </div>
          }
        >
          <span className="text-lg font-semibold tracking-wide">
            {t("check_booking", {
              defaultValue: "تحقّق من الحجز",
            })}
          </span>
        </SectionTitle>

        <div className="mt-6 rounded-[26px] border border-[#e3dccf] bg-white p-4 shadow-[0_16px_40px_rgba(40,32,20,0.08)] sm:p-6">
          <form
            onSubmit={handleCheck}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative min-w-0 flex-1">
              <Phone
                className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("phone", {
                  defaultValue: "رقم الهاتف",
                })}
                value={phone}
                onChange={handlePhoneChange}
                disabled={loading}
                className="h-[52px] w-full rounded-2xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-right text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#b88a25] focus:ring-4 focus:ring-[#d7b55c]/20 disabled:bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className={[
                "flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-extrabold transition sm:min-w-[145px]",
                loading || !phone.trim()
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-gradient-to-br from-[#d7b457] to-[#bd9135] text-[#172033] shadow-[0_8px_18px_rgba(157,112,21,0.20)] hover:brightness-105",
              ].join(" ")}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    className="h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />

                  <span>
                    {t("loading", {
                      defaultValue: "جارٍ التحقق...",
                    })}
                  </span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" aria-hidden="true" />

                  <span>
                    {t("check", {
                      defaultValue: "تحقّق",
                    })}
                  </span>
                </>
              )}
            </button>
          </form>

          {successMessage && (
            <div
              className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"
              role="status"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />

              <span>{successMessage}</span>
            </div>
          )}

          {notFound && (
            <div
              className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-right"
              role="status"
            >
              <p className="text-sm font-extrabold text-amber-900">
                {t("no_booking_found", {
                  defaultValue: "لا يوجد حجز فعّال مرتبط بهذا الرقم.",
                })}
              </p>

              <p className="mt-1 text-xs leading-6 text-amber-800">
                تأكد أن الرقم هو نفسه المستخدم عند الحجز.
              </p>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-5 space-y-4">
            {results.map((booking) => {
              const prettyDate = formatDayAndDate(booking.selectedDate);

              const serviceTitle = t(`service_${booking.selectedService}`, {
                defaultValue: booking.selectedService || "—",
              });

              const isCancelling = cancellingId === booking.docId;

              const enteredCode = codeInputs[booking.docId] || "";

              return (
                <article
                  key={booking.docId}
                  className="overflow-hidden rounded-[26px] border border-[#e2dbcf] bg-white shadow-[0_14px_36px_rgba(38,31,20,0.08)]"
                >
                  <header className="border-b border-[#eee8dc] bg-[#fcfaf5] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ead698] text-[#6d500e]">
                          <UserRound className="h-6 w-6" aria-hidden="true" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-slate-900">
                            {booking.fullName || "بدون اسم"}
                          </h3>

                          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Phone className="h-4 w-4" aria-hidden="true" />

                            <span dir="ltr">
                              {e164ToLocalPretty(booking.phoneNumber)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />

                        {t("active_booking", {
                          defaultValue: "حجز نشط",
                        })}
                      </span>
                    </div>
                  </header>

                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem
                        label={t("date", {
                          defaultValue: "التاريخ",
                        })}
                        value={prettyDate}
                        icon={
                          <CalendarDays
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        }
                        featured
                      />

                      <DetailItem
                        label={t("time", {
                          defaultValue: "الساعة",
                        })}
                        value={booking.selectedTime}
                        icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
                        featured
                      />

                      <DetailItem
                        label={t("service", {
                          defaultValue: "الخدمة",
                        })}
                        value={serviceTitle}
                        icon={
                          <Scissors className="h-4 w-4" aria-hidden="true" />
                        }
                        className="col-span-2"
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/45 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm">
                          <KeyRound className="h-5 w-5" aria-hidden="true" />
                        </div>

                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            {t("cancel_booking", {
                              defaultValue: "إلغاء الحجز",
                            })}
                          </h4>

                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            أدخل كود الحجز الذي حصلت عليه عند التأكيد.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label
                          htmlFor={`cancel-code-${booking.docId}`}
                          className="mb-2 block text-sm font-extrabold text-slate-800"
                        >
                          {t("booking_code", {
                            defaultValue: "كود الحجز",
                          })}
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className="relative min-w-0 flex-1">
                            <KeyRound
                              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                              aria-hidden="true"
                            />

                            <input
                              id={`cancel-code-${booking.docId}`}
                              type="text"
                              inputMode="text"
                              autoComplete="one-time-code"
                              value={enteredCode}
                              onChange={(event) =>
                                handleCodeChange(
                                  booking.docId,
                                  event.target.value,
                                )
                              }
                              placeholder={t("enter_code", {
                                defaultValue: "أدخل كود الحجز",
                              })}
                              disabled={isCancelling}
                              className={[
                                "h-[54px] w-full rounded-2xl border bg-white py-3 pl-4 pr-12",
                                "text-right text-base font-extrabold tracking-wide text-slate-900",
                                "outline-none transition",
                                "placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400",
                                "focus:border-[#b98a21] focus:ring-4 focus:ring-[#d7b55c]/20",
                                "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70",
                                errorMessages[booking.docId]
                                  ? "border-red-300"
                                  : "border-slate-300",
                              ].join(" ")}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCancel(booking)}
                            disabled={isCancelling || !enteredCode.trim()}
                            className={[
                              "flex min-h-[54px] items-center justify-center gap-2 rounded-2xl px-5",
                              "text-sm font-extrabold transition",
                              "sm:min-w-[150px]",
                              isCancelling || !enteredCode.trim()
                                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                : "bg-red-600 text-white shadow-[0_8px_18px_rgba(220,38,38,0.18)] hover:bg-red-700",
                            ].join(" ")}
                          >
                            {isCancelling ? (
                              <>
                                <LoaderCircle
                                  className="h-5 w-5 animate-spin"
                                  aria-hidden="true"
                                />

                                <span>جارٍ الإلغاء</span>
                              </>
                            ) : (
                              <>
                                <Trash2
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />

                                <span>
                                  {t("cancel_booking", {
                                    defaultValue: "إلغاء الحجز",
                                  })}
                                </span>
                              </>
                            )}
                          </button>
                        </div>

                        {errorMessages[booking.docId] && (
                          <p
                            className="mt-2 text-sm font-bold text-red-600"
                            role="alert"
                          >
                            {errorMessages[booking.docId]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default BookingTracker;
