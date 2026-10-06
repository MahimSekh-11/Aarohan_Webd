import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'hi' | 'bn';

interface Dictionary {
  [key: string]: string;
}

interface LanguageState {
  currentLang: Language;
  translations: Record<Language, Dictionary>;
  setLanguage: (lang: Language) => void;
  translate: (text: string) => string;
  fetchTranslation: (text: string) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLang: 'en',
      translations: {
        en: {},
        hi: {},
        bn: {},
      },
      setLanguage: (lang) => set({ currentLang: lang }),
      translate: (text) => {
        const { currentLang, translations, fetchTranslation } = get();
        if (currentLang === 'en' || !text) return text;
        
        const translated = translations[currentLang][text];
        if (translated) return translated;
        
        // Trigger fetch asynchronously if not found
        fetchTranslation(text);
        return text; // Return original temporarily
      },
      fetchTranslation: async (text) => {
        const { currentLang, translations } = get();
        if (currentLang === 'en' || translations[currentLang][text]) return;

        try {
          // Prevent multiple simultaneous fetches for the same text
          set((state) => {
            const newTrans = { ...state.translations };
            newTrans[currentLang] = { ...newTrans[currentLang], [text]: text }; // temporary placeholder
            return { translations: newTrans };
          });

          const res = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, targetLang: currentLang })
          });
          const data = await res.json();
          if (data.translatedText) {
            set((state) => {
              const newTrans = { ...state.translations };
              newTrans[currentLang] = { ...newTrans[currentLang], [text]: data.translatedText };
              return { translations: newTrans };
            });
          }
        } catch (e) {
          console.error('Translation failed', e);
        }
      }
    }),
    {
      name: 'language-storage',
    }
  )
);
