import { FaWhatsapp } from "react-icons/fa";

function FloatingWhatsappButton() {
  return (
    <a
      href="https://wa.me/972549896985" // ← غيّر الرقم لرقمك الحقيقي
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-all duration-300"
      title="Chat on WhatsApp"
    >
      <FaWhatsapp size={24} />
    </a>
  );
}

export default FloatingWhatsappButton;
