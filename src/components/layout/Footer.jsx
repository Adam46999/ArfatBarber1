import { useTranslation } from "react-i18next";

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary text-light text-center p-6 text-sm font-body">
      <div className="max-w-7xl mx-auto">
        <p className="mb-1">
          © {new Date().getFullYear()} Arfat Barber. {t("all_rights")}
        </p>
        <p className="text-gold">{t("footer_note")}</p>
      </div>
    </footer>
  );
}

export default Footer;
