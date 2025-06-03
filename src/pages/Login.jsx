// src/pages/Login.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError(t("fill_required_fields") || "يرجى تعبئة جميع الحقول");
      return;
    }

    try {
      const q = query(collection(db, "users"), where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError(t("wrong_username_or_password") || "اسم المستخدم أو كلمة المرور خاطئة");
        return;
      }

      let userDoc;
      querySnapshot.forEach((doc) => {
        userDoc = doc.data();
      });

      if (userDoc.password === password) {
        localStorage.setItem("barberUser", JSON.stringify({ username: userDoc.username }));
        navigate("/barber");
      } else {
        setError(t("wrong_username_or_password") || "اسم المستخدم أو كلمة المرور خاطئة");
      }
    } catch (err) {
      console.error(err);
      setError(t("login_error") || "حدث خطأ أثناء تسجيل الدخول");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      {/* Spacer للهيدر الثابت */}
      <div className="h-16"></div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          {t("login") || "دخول"}
        </h2>

        {error && (
          <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder={t("username") || "اسم المستخدم"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="
              w-full bg-gray-50 border border-gray-300
              rounded-lg px-4 py-3
              focus:outline-none focus:ring-2 focus:ring-gold
              transition
            "
            required
          />

          <input
            type="password"
            placeholder={t("enter_password") || "كلمة المرور"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="
              w-full bg-gray-50 border border-gray-300
              rounded-lg px-4 py-3
              focus:outline-none focus:ring-2 focus:ring-gold
              transition
            "
            required
          />

          <button
            type="submit"
            className="
              w-full bg-gold text-white font-medium
              py-3 rounded-lg
              hover:bg-yellow-600 transition-colors
            "
          >
            {t("login") || "دخول"}
          </button>
          
        </form>
      </div>
    </div>
  );
}
