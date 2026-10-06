import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language, LANGUAGE_NAMES, t } from '../i18n/translations';

interface LanguageState {
  currentLang: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLang: 'en',
      setLanguage: (lang) => set({ currentLang: lang }),
      t: (text: string) => {
        const { currentLang } = get();
        return t(text, currentLang);
      },
    }),
    { name: 'aarohan-language' }
  )
);

export { LANGUAGE_NAMES };
export type { Language };
// Keep backward compat alias
export const useTranslate = () => useLanguageStore(state => state.t);
