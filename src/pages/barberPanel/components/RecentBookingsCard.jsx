// src/pages/barberPanel/components/RecentBookingsCard.jsx
import { e164ToLocalPretty } from "../../../utils/phone";

export default function RecentBookingsCard({ recentBookings }) {
  if (!recentBookings?.length) return null;

  return (
    <div className="max-w-3xl mx-auto mt-6 text-xs sm:text-sm">
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 text-slate-900">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <div className="flex flex-col">
              <h2 className="font-semibold text-slate-900">
                أحدث الحجوزات (رقم موحّد)
              </h2>
              <span className="text-[11px] text-slate-500">
                آخر {recentBookings.length} حجوزات فعّالة
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 border-t border-slate-100 divide-y divide-slate-100">
          {recentBookings.map((b, idx) => (
            <div
              key={b.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 rounded-xl px-2"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-[11px] text-slate-500">
                    {idx + 1}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 text-sm sm:text-base">
                    {b.fullName || "بدون اسم"}
                  </span>

                  <div className="mt-1 inline-flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-0.5 border border-amber-200 text-amber-800">
                      {b.selectedDate || "—"}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-0.5 border border-sky-200 text-sky-700">
                      {b.selectedTime || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:justify-end sm:min-w-[150px] text-[11px] sm:text-xs">
                <span className="text-slate-500">الرقم الموحّد:</span>
                <span className="font-mono text-sm text-slate-900">
                  {e164ToLocalPretty(b.phoneNumber)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
