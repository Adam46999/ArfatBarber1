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
      className={`h-full ${rtl ? "text-right" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {desc ? <p className="text-sm text-gray-500 mt-1">{desc}</p> : null}
        </div>

        {/* مؤشر الاختيار */}
        <div
          className={`ml-2 h-5 w-5 rounded-full border-2 ${
            selected ? "border-yellow-400 bg-yellow-400" : "border-gray-300"
          }`}
          aria-hidden="true"
        />
      </div>
    </Card>
  );
}
