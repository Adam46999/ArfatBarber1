// src/components/booking/parts/ServiceSelector.jsx
import ServiceOption from "./ServiceOption";
import { useTranslation } from "react-i18next";

// ✅ نخزن فقط المعرّف والأيقونة (بدون نص ثابت)
const SERVICES = [
  { id: "haircut", icon: "haircut" },
  { id: "beard", icon: "beard" },
];

export default function ServiceSelector({ selectedService, onSelect, rtl }) {
  const { t, i18n } = useTranslation();

  // اتجاه الواجهة
  const isRTL = rtl ?? i18n.dir() === "rtl";

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
    >
      {SERVICES.map((s) => (
        <ServiceOption
          key={s.id}
          id={s.id}
          icon={s.icon}
          selected={selectedService === s.id}
          onSelect={onSelect}
          rtl={isRTL}
          // ✅ الاسم من الترجمة
          title={t(`services.${s.id}`)}
          // (اختياري) وصف من الترجمة لو موجود
          desc={t(`services_desc.${s.id}`, { defaultValue: "" })}
        />
      ))}
    </div>
  );
}
