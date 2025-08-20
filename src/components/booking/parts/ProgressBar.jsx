import React from "react";
import {
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaClock,
  FaCut,
  FaCheck,
} from "react-icons/fa";

export default function ProgressBar({ step = 1, progress = 0 }) {
  const dir = (typeof document !== "undefined" && document?.dir) || "rtl";

  // 🔧 خيار: إذا true الخطوة 1 تكون على اليسار (مفيد إذا بدك تقدّم بصري LTR)
  const startOnLeft = true;

  const steps = [FaUser, FaPhone, FaCalendarAlt, FaClock, FaCut, FaCheck];
  const total = steps.length;
  const current = Math.min(Math.max(Number(step) || 1, 1), total);

  // نسبة التقدم
  let pct = Number(progress) || 0;
  if (pct <= 1) pct *= 100;
  pct = Math.max(0, Math.min(pct, 100));
  const fallbackPct = ((current - 1) / (total - 1 || 1)) * 100;
  const barPct = pct > 0 || current === 1 ? pct : fallbackPct;

  // مرسى التعبئة (لو بدكها دومًا من اليسار، خليها "left")
  const anchorSide = startOnLeft ? "left" : dir === "rtl" ? "right" : "left";

  const headStyle =
    anchorSide === "right"
      ? { left: `calc(${100 - barPct}% )` }
      : { left: `calc(${barPct}% )` };

  // نعكس صف الأيقونات فقط لو RTL + بدنا 1 على اليسار
  const stepsRowReverse =
    dir === "rtl" && startOnLeft ? "flex-row-reverse" : "";

  return (
    <div className="w-full" dir={dir}>
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 rounded-t-2xl -mt-6 -mx-6 px-6 pt-6">
        {/* الشريط */}
        <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 transition-all duration-500 rounded-full"
            style={{ [anchorSide]: 0, width: `${barPct}%` }}
          >
            <div className="h-full w-full bg-[#3B82F6]" />
          </div>
          {/* رأس المؤشر واضح */}
          <div
            className="absolute -top-[9px] h-6 w-6 rounded-full bg-[#3B82F6] border-2 border-[#FACC15] shadow-lg"
            style={{ transform: "translateX(-50%)", ...headStyle }}
          />
        </div>

        {/* ✅ نلف الأيقونات حسب الحاجة + نخفي السكروول */}
        <div
          className="
    px-1 pt-5 pb-3   /* ← زدنا مسافة من فوق */
    overflow-x-auto md:overflow-x-visible
    [scrollbar-width:none] [-ms-overflow-style:none]
    [&::-webkit-scrollbar]:hidden
  "
        >
          <ol
            className={`flex ${stepsRowReverse} items-end justify-between gap-4 select-none min-w-full`}
          >
            {steps.map((Icon, idx) => {
              const idx1 = idx + 1;
              const state =
                idx1 < current ? "done" : idx1 === current ? "active" : "todo";

              const badge =
                state === "done"
                  ? "bg-blue-50 border-blue-500 text-[#1F2937]"
                  : state === "active"
                  ? "bg-amber-50 border-amber-400 text-[#1F2937]"
                  : "bg-slate-50 border-slate-300 text-slate-500";

              const color =
                state === "done"
                  ? "text-blue-600"
                  : state === "active"
                  ? "text-[#1F2937]"
                  : "text-slate-500";

              return (
                <li
                  key={idx}
                  className="flex-1 min-w-[64px] flex flex-col items-center gap-1"
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${badge}`}
                  >
                    {idx1}
                  </span>
                  <Icon
                    className={`text-base md:text-lg ${color}`}
                    aria-hidden
                  />
                </li>
              );
            })}
          </ol>
        </div>

        {/* موجز صغير */}
        <div className="flex items-center justify-between py-2 text-xs text-slate-600">
          <span>
            خطوة <strong className="text-[#1F2937]">{current}</strong> من{" "}
            <strong className="text-[#1F2937]">{total}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
