// src/components/booking/parts/ServiceOption.jsx
import { FaCut } from "react-icons/fa";
import { GiBeard } from "react-icons/gi";
import Card from "../../ui/Card";

const ICONS = {
  haircut: FaCut,
  beard: GiBeard,
};

export default function ServiceOption({
  id,
  title,
  desc,
  icon = "haircut",
  selected = false,
  onSelect,
  rtl = false,
}) {
  const Icon = ICONS[icon] || FaCut;

  return (
    <Card
      selected={selected}
      onClick={() => onSelect?.(id)}
      className={`h-full min-h-[72px] !rounded-[16px] !p-3.5 sm:!p-4 ${selected ? "!border-[#c9a44b] !bg-[#fffaf0] !ring-[#c9a44b] !shadow-[0_8px_24px_rgba(128,94,22,0.12)]" : "!border-[#e5dfd2] !bg-[#fffdfa] hover:!border-[#d8c89e] hover:!shadow-[0_8px_20px_rgba(31,24,12,0.07)]"} ${rtl ? "text-right" : ""}`}
    >
      <div className="flex min-h-[44px] items-center gap-3">
        <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border shadow-[0_4px_12px_rgba(128,94,22,0.06)] ${selected ? "border-[#ddc476] bg-[#f5e7bd] text-[#7c5b15]" : "border-[#eadfca] bg-[#f9f2df] text-[#9a7625]"}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className={`text-[15px] font-extrabold sm:text-base ${selected ? "text-[#6f5518]" : "text-slate-900"}`}>{title}</h3>
          {desc ? <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">{desc}</p> : null}
        </div>

        {/* مؤشر الاختيار */}
        <div
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
            selected
              ? "border-[#c9a44b] bg-[#c9a44b] text-white shadow-[0_3px_10px_rgba(128,94,22,0.18)]"
              : "border-[#d7d1c7] bg-white text-transparent",
          ].join(" ")}
          aria-hidden="true"
        >
          <span className="text-[11px] font-black leading-none">✓</span>
        </div>
      </div>
    </Card>
  );
}
