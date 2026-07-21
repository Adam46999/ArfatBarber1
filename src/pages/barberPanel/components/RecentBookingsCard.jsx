// src/pages/barberPanel/components/RecentBookingsCard.jsx

import { e164ToLocalPretty } from "../../../utils/phone";

function formatDateLabel(dateYMD) {
  if (!dateYMD) {
    return "—";
  }

  const date = new Date(`${dateYMD}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateYMD;
  }

  return new Intl.DateTimeFormat("ar", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(date);
}

function getCreatedAtLabel(booking) {
  let createdDate = null;

  const createdAtMs = Number(booking?.createdAtMs);

  if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
    createdDate = new Date(createdAtMs);
  } else if (
    booking?.createdAt &&
    typeof booking.createdAt.toDate === "function"
  ) {
    createdDate = booking.createdAt.toDate();
  } else if (booking?.createdAt instanceof Date) {
    createdDate = booking.createdAt;
  }

  if (!createdDate || Number.isNaN(createdDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("ar", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdDate);
}

export default function RecentBookingsCard({ recentBookings = [] }) {
  if (!recentBookings.length) {
    return null;
  }

  return (
    <section className="mx-auto mt-4 max-w-3xl text-xs sm:mt-5 sm:text-sm">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
              📅
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 sm:text-base">
                أحدث الحجوزات
              </h2>

              <p className="mt-0.5 text-[10px] font-semibold text-slate-500 sm:text-[11px]">
                آخر {recentBookings.length} زبائن قاموا بالحجز
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
            آخر {recentBookings.length}
          </span>
        </div>

        {/* Bookings */}
        <div className="divide-y divide-slate-100">
          {recentBookings.map((booking, index) => {
            const isLatest = index === 0;

            const createdAtLabel = getCreatedAtLabel(booking);

            return (
              <div
                key={booking.id}
                className={[
                  "relative px-4 py-3 transition sm:px-5",
                  isLatest
                    ? "bg-emerald-50/35"
                    : "bg-white hover:bg-slate-50/70",
                ].join(" ")}
              >
                {/* علامة أحدث حجز */}
                {isLatest && (
                  <div className="absolute bottom-0 right-0 top-0 w-1 bg-emerald-500" />
                )}

                <div className="flex items-start justify-between gap-3">
                  {/* معلومات الزبون */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-black text-slate-900 sm:text-base">
                        {booking.fullName || "بدون اسم"}
                      </span>

                      {isLatest && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 sm:text-[10px]">
                          آخر حجز
                        </span>
                      )}
                    </div>

                    {/* موعد الزبون */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-black text-sky-700">
                        🕒 {booking.selectedTime || "—"}
                      </span>

                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600">
                        {formatDateLabel(booking.selectedDate)}
                      </span>
                    </div>

                    {/* الخدمة */}
                    {booking.selectedService && (
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">
                        {booking.selectedService}
                      </div>
                    )}

                    {/* متى قام الزبون بالحجز */}
                    {createdAtLabel && (
                      <div className="mt-1.5 text-[10px] font-semibold text-slate-400">
                        تم الحجز الساعة {createdAtLabel}
                      </div>
                    )}
                  </div>

                  {/* رقم الزبون */}
                  <div className="shrink-0 text-left">
                    <div className="text-[9px] font-bold text-slate-400 sm:text-[10px]">
                      رقم الزبون
                    </div>

                    <div
                      dir="ltr"
                      className="mt-1 font-mono text-xs font-black text-slate-800 sm:text-sm"
                    >
                      {e164ToLocalPretty(booking.phoneNumber) || "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
