/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"],
        ar: ["Cairo", "sans-serif"],
        tajawal: ["Tajawal", "sans-serif"],
        notokufi: ["Noto Kufi Arabic", "sans-serif"],
      },

      colors: {
        primary: "#1a1a1a", // 🖤 أسود ناعم راقٍ (خلفيات)
        beige: "#f0e6d2", // 🤍 بيج فخم (خلفيات فاتحة)
        gold: "#bfa063", // ✨ ذهبي فاخر (عناوين وأزرار بارزة)
        light: "#ffffff", // أبيض للنصوص على خلفية داكنة
        darkText: "#333333", // رمادي غامق للنصوص على بيج
      },

      // ✨ هون أضفنا الأنيميشن
      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(191, 160, 99, 0.7)",
          },
          "50%": {
            transform: "scale(1.05)",
            boxShadow: "0 0 20px 5px rgba(191, 160, 99, 0.5)",
          },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.5s ease-out forwards",
        pulseGlow: "pulseGlow 1.5s infinite",
      },
    },
  },
  plugins: [],
};
