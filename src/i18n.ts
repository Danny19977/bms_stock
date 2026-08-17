import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

export const LANGUAGE_STORAGE_KEY = 'bms_stock_language';

const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const browserLanguage = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr';

export const i18n = createI18n({
  legacy: false,
  locale: savedLanguage === 'en' || savedLanguage === 'fr' ? savedLanguage : browserLanguage,
  fallbackLocale: 'fr',
  messages: { en, fr }
});

document.documentElement.lang = i18n.global.locale.value;
