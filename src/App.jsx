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
    const messaging = getMessaging(app);

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        getToken(messaging, {
          vapidKey: "BMSKYpj6OfL2RinVjw4jUNlL-Hbi1Ev4eiTibIKlvFwqSULUm42ricVJRcKbptmiepuDbl3andf-F2tf7Cmr-U8" // ← ✨ أدخل مفتاح VAPID هنا من Firebase
        }).then((currentToken) => {
          if (currentToken) {
            console.log("✅ Token:", currentToken);
            // يمكنك تخزين هذا التوكين مثلاً في Firestore أو إرساله مع الحجز
          } else {
            console.warn("🔒 لم يتم الحصول على التوكين");
          }
        });
      }
    });

    onMessage(messaging, (payload) => {
      console.log("🔔 إشعار مباشر أثناء التصفح:", payload);
      alert(`${payload.notification.title}\n${payload.notification.body}`);
    });
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
