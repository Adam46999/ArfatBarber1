// src/components/layout/LanguageSwitcher.jsx

import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.resolvedLanguage || i18n.language || "ar";

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);

    const isRTL = language === "ar" || language === "he";

    document.documentElement.dir = isRTL ? "rtl" : "ltr";

    document.documentElement.lang = language;

    localStorage.setItem("lang", language);
  };

  return (
    <div className="relative shrink-0">
      {!compact && (
        <Languages
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8a6a20]"
          aria-hidden="true"
        />
      )}

      <select
        value={currentLanguage}
        onChange={(event) => changeLanguage(event.target.value)}
        aria-label="Language"
        className={[
          "h-10 appearance-none rounded-xl",
          "border border-white/[0.10]",
          "bg-[#f8f7f3] text-[#282828]",
          "text-sm font-bold",
          "outline-none transition",
          "shadow-[0_3px_10px_rgba(0,0,0,0.16)]",
          "focus:border-[#c5a04a] focus:ring-4 focus:ring-[#c8a34e]/20",
          compact ? "w-[88px] px-3" : "min-w-[118px] py-2 pl-9 pr-4",
        ].join(" ")}
      >
        <option value="ar">عربي</option>
        <option value="he">עברית</option>
        <option value="en">English</option>
      </select>

      <span
        className={[
          "pointer-events-none absolute top-1/2 -translate-y-1/2",
          "border-x-[4px] border-t-[5px]",
          "border-x-transparent border-t-[#585858]",
          compact ? "left-3" : "right-3",
        ].join(" ")}
        aria-hidden="true"
      />
    </div>
  );
}

export default LanguageSwitcher;
