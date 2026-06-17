// src/components/booking/CheckReservation.jsx

import { createElement, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Clock3,
  LoaderCircle,
  Phone,
  Scissors,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { db } from "../../firebase";
import SectionTitle from "../common/SectionTitle";
import {
  e164ToLocalPretty,
  isILPhoneE164,
  toILPhoneE164,
} from "../../utils/phone";

function createBookingDate(booking) {
  if (!booking?.selectedDate || !booking?.selectedTime) {
    return null;
  }

  const date = new Date(`${booking.selectedDate}T${booking.selectedTime}`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function InfoRow({ icon, label, value, highlight = false }) {
  return (
    <div
      className={[
        "flex min-w-0 items-center gap-3 rounded-2xl border p-3.5",
        highlight
          ? "border-[#d2ad54] bg-[#fff8e7]"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          highlight
            ? "bg-[#f4dfaa] text-[#76550f]"
            : "bg-white text-slate-500 shadow-sm",
        ].join(" ")}
      >
        {createElement(icon, {
          className: "h-5 w-5",
          "aria-hidden": true,
        })}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500">{label}</p>

        <p
          className={[
            "mt-0.5 break-words text-sm font-extrabold",
            highlight ? "text-[#63470e]" : "text-slate-900",
          ].join(" ")}
        >
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div
      className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center"
      role="status"
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
        <Search className="h-5 w-5" aria-hidden="true" />
      </div>

      <p className="mt-3 text-sm font-extrabold text-amber-900">{title}</p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-amber-800">
        {description}
      </p>
    </div>
  );
}

export default function CheckReservation() {
  const { t, i18n } = useTranslation();

  const [phone, setPhone] = useState("");
  const [results, setResults] = useState([]);
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const isRTL = i18n.dir() === "rtl";

  const resetFeedback = () => {
    setMessageType("");
    setResults([]);
  };

  const handlePhoneChange = (event) => {
    const nextValue = event.target.value;

    setPhone(nextValue);

    if (messageType || results.length > 0) {
      resetFeedback();
    }
  };

  const handleCheck = async (event) => {
    event?.preventDefault();

    const trimmedPhone = phone.trim();

    setResults([]);
    setMessageType("");

    if (!trimmedPhone) {
      setMessageType("empty");
      return;
    }

    const normalizedPhone = toILPhoneE164(trimmedPhone);

    if (!isILPhoneE164(normalizedPhone)) {
      setMessageType("invalid");
      return;
    }

    setLoading(true);

    try {
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("phoneNumber", "==", normalizedPhone),
        where("bookingCode", "!=", ""),
      );

      const snapshot = await getDocs(bookingsQuery);

      const bookings = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .filter(
          (booking) =>
            booking.fullName &&
            booking.selectedDate &&
            booking.selectedTime &&
            booking.bookingCode,
        )
        .sort((firstBooking, secondBooking) => {
          const firstDate = createBookingDate(firstBooking);
          const secondDate = createBookingDate(secondBooking);

          if (!firstDate && !secondDate) return 0;
          if (!firstDate) return 1;
          if (!secondDate) return -1;

          return firstDate.getTime() - secondDate.getTime();
        });

      if (bookings.length === 0) {
        setMessageType("notFound");
        return;
      }

      setResults(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const getServiceLabel = (service) => {
    if (!service) return "-";

    return t(`services.${service}`, {
      defaultValue: service,
    });
  };

  return (
    <section
      id="check-booking"
      className="bg-[#f8f6f1] px-4 py-14 sm:px-6 md:py-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 text-center">
          <SectionTitle>
            {t("check_reservation", {
              defaultValue: "تحقق من الحجز",
            })}
          </SectionTitle>

          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
            {t("check_reservation_description", {
              defaultValue:
                "أدخل رقم الهاتف المستخدم أثناء الحجز لعرض تفاصيل موعدك.",
            })}
          </p>
        </div>

        <div className="rounded-[26px] border border-[#e5ded0] bg-white p-4 shadow-[0_16px_45px_rgba(38,31,20,0.08)] sm:p-6">
          <form onSubmit={handleCheck} noValidate>
            <label
              htmlFor="reservation-phone"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              {t("phone_number", {
                defaultValue: "رقم الهاتف",
              })}
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Phone
                  className={[
                    "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400",
                    isRTL ? "right-4" : "left-4",
                  ].join(" ")}
                  aria-hidden="true"
                />

                <input
                  id="reservation-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder={t("phone_placeholder", {
                    defaultValue: "05X-XXXXXXX",
                  })}
                  disabled={loading}
                  className={[
                    "h-[52px] w-full rounded-2xl border bg-white py-3.5 text-base font-semibold text-slate-900 outline-none transition",
                    "placeholder:text-slate-400",
                    "focus:border-[#b98a21] focus:ring-4 focus:ring-[#d7b55c]/20",
                    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70",
                    isRTL ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left",
                    messageType === "invalid" || messageType === "empty"
                      ? "border-red-300"
                      : "border-slate-300",
                  ].join(" ")}
                  aria-invalid={
                    messageType === "invalid" || messageType === "empty"
                  }
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={[
                  "flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl px-6",
                  "bg-gradient-to-br from-[#d8b657] to-[#bd9134]",
                  "text-sm font-extrabold text-[#172033]",
                  "shadow-[0_8px_18px_rgba(157,112,21,0.22)]",
                  "transition hover:brightness-105",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d7b55c]/30",
                  "disabled:cursor-not-allowed disabled:opacity-65",
                  "sm:min-w-[150px]",
                ].join(" ")}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />

                    <span>
                      {t("checking", {
                        defaultValue: "جاري التحقق",
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" aria-hidden="true" />

                    <span>
                      {t("check", {
                        defaultValue: "تحقق",
                      })}
                    </span>
                  </>
                )}
              </button>
            </div>

            {messageType === "empty" && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {t("phone_required", {
                  defaultValue: "أدخل رقم الهاتف أولًا.",
                })}
              </p>
            )}

            {messageType === "invalid" && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {t("invalid_phone", {
                  defaultValue: "تأكد من كتابة رقم هاتف صحيح يبدأ بـ 05.",
                })}
              </p>
            )}
          </form>

          {messageType === "notFound" && (
            <EmptyState
              title={t("reservation_not_found", {
                defaultValue: "لم نجد حجزًا مرتبطًا بهذا الرقم",
              })}
              description={t("reservation_not_found_description", {
                defaultValue:
                  "تأكد أن الرقم هو نفسه الذي استُخدم أثناء الحجز ثم حاول مرة أخرى.",
              })}
            />
          )}

          {messageType === "error" && (
            <EmptyState
              title={t("check_error", {
                defaultValue: "تعذّر التحقق حاليًا",
              })}
              description={t("try_again_later", {
                defaultValue:
                  "حدث خطأ أثناء جلب الحجوزات. حاول مرة أخرى بعد قليل.",
              })}
            />
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <h3 className="text-base font-extrabold text-slate-900">
                {t("your_reservations", {
                  defaultValue: "حجوزاتك",
                })}
              </h3>

              <span className="rounded-full bg-[#eee3c5] px-3 py-1 text-xs font-extrabold text-[#74530e]">
                {results.length}
              </span>
            </div>

            {results.map((booking) => (
              <article
                key={booking.id}
                className="overflow-hidden rounded-[24px] border border-[#e4dccd] bg-white shadow-[0_12px_32px_rgba(38,31,20,0.07)]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[#ece6db] bg-[#fbf8f1] px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ead394] text-[#6f500d]">
                      <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">
                        {t("booking_code", {
                          defaultValue: "كود الحجز",
                        })}
                      </p>

                      <p className="truncate text-lg font-black tracking-wide text-slate-900">
                        {booking.bookingCode}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                    {t("confirmed", {
                      defaultValue: "مؤكد",
                    })}
                  </span>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                  <InfoRow
                    icon={UserRound}
                    label={t("full_name", {
                      defaultValue: "الاسم الكامل",
                    })}
                    value={booking.fullName}
                  />

                  <InfoRow
                    icon={Phone}
                    label={t("phone_number", {
                      defaultValue: "رقم الهاتف",
                    })}
                    value={e164ToLocalPretty(booking.phoneNumber)}
                  />

                  <InfoRow
                    icon={CalendarDays}
                    label={t("date", {
                      defaultValue: "التاريخ",
                    })}
                    value={booking.selectedDate}
                    highlight
                  />

                  <InfoRow
                    icon={Clock3}
                    label={t("time", {
                      defaultValue: "الساعة",
                    })}
                    value={booking.selectedTime}
                    highlight
                  />

                  <div className="sm:col-span-2">
                    <InfoRow
                      icon={Scissors}
                      label={t("service", {
                        defaultValue: "الخدمة",
                      })}
                      value={getServiceLabel(booking.selectedService)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
