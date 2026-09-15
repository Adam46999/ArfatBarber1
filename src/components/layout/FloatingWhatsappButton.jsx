import { FaWhatsapp } from "react-icons/fa";
import { useLocation } from "react-router-dom";

function FloatingWhatsappButton() {
  const { pathname } = useLocation();

  const isProductsPage =
    pathname === "/products" || pathname.startsWith("/products/");

  return (
    <a
      href="https://wa.me/972549896985"
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-5 z-50 items-center justify-center rounded-full bg-green-500 p-3 text-white shadow-lg transition-all duration-300 hover:bg-green-600 active:scale-95 ${
        isProductsPage
          ? "hidden bottom-5 md:flex"
          : "flex bottom-[calc(20px+env(safe-area-inset-bottom))]"
      }`}
      title="Chat on WhatsApp"
      aria-label="Chat on WhatsApp"
    >
      <FaWhatsapp size={24} />
    </a>
  );
}

export default FloatingWhatsappButton;
