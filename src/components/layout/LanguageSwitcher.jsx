import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === "ar" || lng === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lng;
    localStorage.setItem("lang", lng);
  };

  return (
    <div className="relative">
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        value={i18n.language}
        className="bg-white text-primary px-3 py-2 rounded-md border text-sm shadow focus:outline-none"
      >
        <option value="en">English</option>
        <option value="ar">عربي</option>
        <option value="he">עברית</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
