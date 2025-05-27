import { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError(t("fill_required_fields"));
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError(t("wrong_username_or_password"));
        return;
      }

      let userDoc;
      querySnapshot.forEach((doc) => {
        userDoc = doc.data();
      });

      if (userDoc.password === password) {
        // تسجيل الدخول ناجح - تخزين الحالة في localStorage
        localStorage.setItem("barberUser", JSON.stringify({ username: userDoc.username }));
        navigate("/barber");
      } else {
        setError(t("wrong_username_or_password"));
      }
    } catch (err) {
      setError(t("login_error"));
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md p-6 rounded-lg max-w-sm w-full text-center"
      >
        <h2 className="text-xl font-bold mb-4">{t("login")}</h2>

        <input
          type="text"
          placeholder={t("username") || "Username"}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
          required
        />

        <input
          type="password"
          placeholder={t("enter_password") || "Enter Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
          required
        />

        {error && (
          <p className="text-red-600 mb-4 text-sm font-semibold">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-gold text-primary font-semibold py-2 rounded hover:bg-darkText hover:text-white transition"
        >
          {t("login")}
        </button>
      </form>
    </div>
  );
}

export default Login;
