import { useTranslation } from "react-i18next";

function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-primary text-light flex flex-col items-center justify-center text-center px-4 font-body">
      <h1 className="text-6xl font-heading text-gold mb-4">404</h1>
      <p className="text-xl md:text-2xl mb-6">
        {t("not_found_message") || "Oops! The page you're looking for doesn't exist."}
      </p>
      <a
        href="/"
        className="bg-gold text-primary px-6 py-3 rounded-full font-semibold hover:bg-darkText hover:text-light transition"
      >
        {t("go_home") || "Go Back Home"}
      </a>
    </div>
  );
}

export default NotFound;
