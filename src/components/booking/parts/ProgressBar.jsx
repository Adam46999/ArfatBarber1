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
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 rounded-t-2xl -mt-6 -mx-6 px-6 pt-6">
        <ol className="flex items-end justify-between gap-3 sm:gap-4 select-none">
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
                          ? "border-amber-400 bg-amber-50"
                          : isDone
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-300 bg-slate-50"
                      }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <Icon
                      className={`${
                        isActive
                          ? "text-[#1F2937]"
                          : isDone
                            ? "text-blue-600"
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
      </div>
    </div>
  );
}
