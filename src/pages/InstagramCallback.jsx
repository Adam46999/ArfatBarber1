import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function InstagramCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      // 🔥 ترسل الكود لسيرفرك (لتبديل الكود بـ access token وبيانات المستخدم)
      fetch("https://<YOUR_BACKEND_ENDPOINT>/auth/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          // 🔐 خزن بيانات الحلاق في localStorage
          localStorage.setItem("barberUser", JSON.stringify(data.user));
          // ✅ توجيه المستخدم لصفحة الحلاق بعد تسجيل الدخول
          navigate("/barber");
        })
        .catch((err) => {
          console.error("Instagram Login Error:", err);
          navigate("/login"); // فشل؟ رجعه لصفحة الدخول
        });
    } else {
      navigate("/login"); // ما فيه كود؟ رجعه لصفحة الدخول
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      جاري تسجيل الدخول عبر إنستغرام...
    </div>
  );
}

export default InstagramCallback;
