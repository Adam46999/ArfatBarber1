import { useTranslation } from "react-i18next";

function SecretBarberButton() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "he";

  return (
    <button
      onClick={() => window.location.href = "/barber"}
      className={`fixed bottom-3 ${isRTL ? "left-3" : "right-3"} text-white text-2xl z-50 hover:text-gold transition`}
      title="دخول الحلاق"
    >
      ✂️
    </button>
  );
}

export default SecretBarberButton;
