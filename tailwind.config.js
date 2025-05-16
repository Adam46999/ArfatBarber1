/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"],
        ar: ["Cairo", "sans-serif"],
      },
      colors: {
        primary: "#1a1a1a",     // 🖤 أسود ناعم راقٍ (خلفيات)
        beige: "#f0e6d2",       // 🤍 بيج فخم (خلفيات فاتحة)
        gold: "#bfa063",        // ✨ ذهبي فاخر (عناوين وأزرار بارزة)
        light: "#ffffff",       // أبيض للنصوص على خلفية داكنة
        darkText: "#333333"     // رمادي غامق للنصوص على بيج
      },
    },
  },
  plugins: [],
};