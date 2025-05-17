import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === "ar" || lng === "he" ? "rtl" : "ltr";
  };

  return (
    <div className="relative">
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        defaultValue={i18n.language}
        className="bg-gray-800 text-white px-2 py-1 rounded text-sm"
      >
        <option value="en">English</option>
        <option value="ar">عربي</option>
        <option value="he">עברית</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
