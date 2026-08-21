// ✅ App.jsx بعد تعديل حماية FCM
import Header from "./components/layout/Header";
import AppRoutes from "./routes";
import "./i18n";
import { useTranslation } from "react-i18next";
import FloatingWhatsappButton from "./components/layout/FloatingWhatsappButton";
import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";

function App() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  useEffect(() => {
    // ✅ تأكد إن المتصفح يدعم الإشعارات
    if (!("Notification" in window)) return;

    try {
      const messaging = getMessaging(app);


      // ✅ استقبال الإشعار في حال كان المستخدم يفتح الموقع
      onMessage(messaging, (payload) => {
        alert(`${payload.notification.title}\n${payload.notification.body}`);
      });
    } catch (e) {
      console.warn("🔴 FCM Init error", e);
    }
  }, []);

  return (
    <div className={`${fontClass} min-h-screen`}>
      <Header />
      <AppRoutes />
      <FloatingWhatsappButton />
    </div>
  );
}

export default App;
