// ✅ SecretBarberButton.jsx
import { useNavigate } from "react-router-dom";

function SecretBarberButton() {
  const navigate = useNavigate();

  return (
    <div className="w-full text-center mt-6">
      <button
        onClick={() => navigate("/login")}
        title="دخول الحلاق"
        className="font-heading text-gold text-2xl md:text-3xl tracking-wide hover:text-yellow-300 transition-all"
        style={{ fontWeight: 700, letterSpacing: "1px" }}
      >
        Arfat Barber
      </button>
    </div>
  );
}

export default SecretBarberButton;
