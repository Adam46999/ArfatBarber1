// src/components/layout/Footer.jsx

import { useTranslation } from "react-i18next";
import { FaFacebookF, FaInstagram, FaPhoneAlt, FaTiktok } from "react-icons/fa";
import { SiWaze } from "react-icons/si";

function SocialLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={[
        "flex h-11 w-11 items-center justify-center rounded-full",
        "border border-[#c7a34f] bg-white/[0.025] text-[#d2af58]",
        "transition duration-150",
        "hover:border-[#e0c273] hover:bg-[#c8a34e] hover:text-[#171717]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d2af58]/25",
      ].join(" ")}
    >
      {children}
    </a>
  );
}

function Footer() {
  const { t } = useTranslation();

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden bg-[#171717] px-4 pb-24 pt-12 text-[#f5f1e8] font-body sm:px-6 sm:pb-16 sm:pt-14"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-28 -top-28 h-64 w-64 rounded-full bg-[#c7a34f]/[0.06] blur-3xl" />

        <div className="absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-[#c7a34f]/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.14em] text-[#a89058]">
            ARFAT BARBER
          </p>

          <h2 className="mt-2 font-notokufi text-2xl font-extrabold leading-snug text-[#d0ac55] sm:text-3xl">
            {t("contact", {
              defaultValue: "تواصل معنا",
            })}
          </h2>

          <div
            className="mx-auto mt-4 h-px w-14 bg-gradient-to-r from-transparent via-[#c7a34f] to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
          <a
            href="https://waze.com/ul?ll=32.93047,35.27657&navigate=yes"
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "group flex min-h-[62px] items-center gap-3 rounded-2xl",
              "border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-right",
              "transition duration-150",
              "hover:border-[#c7a34f]/60 hover:bg-white/[0.055]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c7a34f]/20",
            ].join(" ")}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c7a34f]/10 text-[#d4b35f]">
              <SiWaze size={20} aria-hidden="true" />
            </span>

            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white/50">
                {t("location", {
                  defaultValue: "الموقع",
                })}
              </span>

              <span className="mt-0.5 block truncate text-sm font-extrabold text-[#eee5cf] transition group-hover:text-white">
                {t("address", {
                  defaultValue: "البعنة - شارع غدارة",
                })}
              </span>
            </span>
          </a>

          <a
            href="tel:+972549896985"
            className={[
              "group flex min-h-[62px] items-center gap-3 rounded-2xl",
              "border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-right",
              "transition duration-150",
              "hover:border-[#c7a34f]/60 hover:bg-white/[0.055]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c7a34f]/20",
            ].join(" ")}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c7a34f]/10 text-[#d4b35f]">
              <FaPhoneAlt size={17} aria-hidden="true" />
            </span>

            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white/50">
                {t("phone_number", {
                  defaultValue: "رقم الهاتف",
                })}
              </span>

              <span
                className="mt-0.5 block text-sm font-extrabold text-[#eee5cf] transition group-hover:text-white"
                dir="ltr"
              >
                +972 54-989-6985
              </span>
            </span>
          </a>
        </div>

        <div className="mt-7">
          <p className="text-center text-xs font-semibold text-white/45">
            {t("follow_us", {
              defaultValue: "تابعنا على",
            })}
          </p>

          <div className="mt-3 flex items-center justify-center gap-3">
            <SocialLink
              href="https://www.instagram.com/arafat_barber/"
              label="Instagram"
            >
              <FaInstagram size={19} />
            </SocialLink>

            <SocialLink href="https://facebook.com" label="Facebook">
              <FaFacebookF size={18} />
            </SocialLink>

            <SocialLink
              href="https://www.tiktok.com/@arfatbarber"
              label="TikTok"
            >
              <FaTiktok size={18} />
            </SocialLink>
          </div>
        </div>

        <div className="mt-8 border-t border-white/[0.08] pt-5">
          <p className="text-center text-xs leading-6 text-white/55">
            © {currentYear} Arfat Barber.{" "}
            {t("all_rights", {
              defaultValue: "جميع الحقوق محفوظة.",
            })}
          </p>
        </div>
      </div>

      <a
        href="/barber"
        className={[
          "absolute bottom-4 left-4 z-10",
          "font-serif text-sm font-bold text-[#c9a54f]",
          "transition hover:text-[#e4c875]",
          "focus-visible:outline-none focus-visible:underline",
          "sm:bottom-5 sm:left-6 sm:text-base",
        ].join(" ")}
        title={t("barber_login", {
          defaultValue: "دخول لوحة تحكم الحلاق",
        })}
      >
        Arfat Barber
      </a>
    </footer>
  );
}

export default Footer;
