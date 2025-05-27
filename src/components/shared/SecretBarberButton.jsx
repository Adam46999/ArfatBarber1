import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function SecretBarberButton() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "he";
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        console.log("✅ الزر اشتغل");  // 🔥 هذا السطر للتأكد
        navigate("/barber");
      }}
      className={`fixed bottom-3 ${isRTL ? "left-3" : "right-3"} text-white text-2xl z-50 hover:text-gold transition`}
      title="دخول الحلاق"
    >
      ✂️
    </button>
  );
}

export default SecretBarberButton;
