import Header from "./components/Header";
import AppRoutes from "./routes";
import "./i18n";
import { useTranslation } from "react-i18next";

function App() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const fontClass = isArabic ? "font-ar" : "font-body";

  return (
    <div className={`${fontClass} min-h-screen`}>
      <Header />
      <AppRoutes />
    </div>
  );
}

export default App;
