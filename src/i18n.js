import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './translations/en.json';
import translationAR from './translations/ar.json';
import translationHE from './translations/he.json';

const resources = {
  en: { translation: translationEN },
  ar: { translation: translationAR },
  he: { translation: translationHE },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
lng: localStorage.getItem("lang") || "ar",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' || lng === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  localStorage.setItem("lang", lng);
});

export default i18n;
