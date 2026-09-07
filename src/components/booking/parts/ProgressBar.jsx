// src/components/booking/parts/ProgressBar.jsx
import React, { useMemo } from "react";
import {
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaClock,
  FaCut,
  FaCheck,
} from "react-icons/fa";

/**
 * مؤشر بسيط بدون أرقام/بار:
 *  - step: الخطوة النشطة (1..6)
 *  - completed: كائن بولياني لكل خطوة {name,phone,date,time,service,confirm}
 *  - labels: أسماء اختيارية تظهر من sm+
 */
export default function ProgressBar({ step = 1, completed = {}, labels }) {
  const dir = (typeof document !== "undefined" && document?.dir) || "rtl";

  const Icons = useMemo(
    () => [FaUser, FaPhone, FaCalendarAlt, FaClock, FaCut, FaCheck],
    [],
  );
  const keys = ["name", "phone", "date", "time", "service", "confirm"];
  const total = Icons.length;
  const current = Math.min(Math.max(Number(step) || 1, 1), total);

  return (
    <div className="w-full" dir={dir} aria-label="Progress steps">
      <div className="sticky top-0 z-30 -mx-5 -mt-5 rounded-t-[27px] border-b border-[#eadfca]/80 bg-[#fffdfa]/95 px-4 pb-3 pt-5 shadow-[0_8px_22px_rgba(31,24,12,0.05)] backdrop-blur sm:-mx-8 sm:-mt-8 sm:px-6 sm:pt-6">
        <ol className="flex items-end justify-between gap-1.5 select-none sm:gap-3">
          {Icons.map((Icon, idx) => {
            const idx1 = idx + 1;
            const isActive = idx1 === current;
            const isDone = Boolean(completed[keys[idx]]);

            return (
              <li key={idx1} className="flex-1">
                <div className="relative flex flex-col items-center">
                  {/* ✓ مستقلة لكل خطوة */}
                  <div
                    className={`absolute -top-3 h-5 w-5 rounded-full flex items-center justify-center text-[11px]
                    ${
                      isDone
                        ? "bg-emerald-500 text-white shadow"
                        : "bg-slate-200 text-slate-400"
                    }`}
                    title={isDone ? "مكتملة" : "غير مكتملة"}
                  >
                    ✓
                  </div>

                  <div
                    className={`h-10 w-10 rounded-full border flex items-center justify-center
                      ${
                        isActive
                          ? "border-[#c9a44b] bg-[#fff7dc] shadow-[0_0_0_3px_rgba(201,164,75,0.13)]"
                          : isDone
                            ? "border-[#d9c17a] bg-[#fffaf0]"
                            : "border-[#ddd8ce] bg-[#f8f7f4]"
                      }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <Icon
                      className={`${
                        isActive
                          ? "text-[#6f5518]"
                          : isDone
                            ? "text-[#9a7625]"
                            : "text-slate-500"
                      } text-lg`}
                      aria-hidden
                    />
                  </div>

                  {labels?.[idx] && (
                    <span className="hidden sm:block text-[11px] text-slate-600 mt-2 truncate max-w-[90px]">
                      {labels[idx]}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {labels?.[current - 1] && (
          <p className="mt-2.5 text-center text-[11px] font-bold text-[#806321] sm:hidden">
            {labels[current - 1]}
          </p>
        )}
      </div>
    </div>
  );
}
