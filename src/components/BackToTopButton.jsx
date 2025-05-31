// src/components/layout/BackToTopButton.jsx

import { useEffect, useState } from "react";
import { FaChevronUp } from "react-icons/fa";

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      title="العودة للأعلى"
      className={`
        fixed bottom-20 right-5 z-50 flex items-center justify-center
        w-12 h-12 rounded-full
        bg-gold text-white text-xl
        shadow-lg
        transform transition-all duration-300
        ${visible ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}
        hover:bg-yellow-500
      `}
    >
      <FaChevronUp />
    </button>
  );
}

export default BackToTopButton;
