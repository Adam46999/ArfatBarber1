// src/components/booking/parts/ServiceSelector.jsx
import ServiceOption from "./ServiceOption";

const SERVICES = [
  {
    id: "haircut",
    title: "قص شعر",
    icon: "haircut",
  },
  {
    id: "beard",
    title: "تعليم لحية",
    icon: "beard",
  },
];

export default function ServiceSelector({ selectedService, onSelect, t, rtl }) {
  const isRTL = rtl ?? t?.("dir") === "rtl";

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      {SERVICES.map((s) => (
        <ServiceOption
          key={s.id}
          id={s.id}
          title={s.title}
          desc={s.desc}
          icon={s.icon}
          selected={selectedService === s.id}
          onSelect={onSelect}
          rtl={isRTL}
        />
      ))}
    </div>
  );
}
