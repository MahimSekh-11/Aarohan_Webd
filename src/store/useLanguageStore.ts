import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LANGUAGE_NAMES, t as translateTextFn } from '../i18n/translations';
import type { Language } from '../i18n/translations';
import { detectTextLanguage } from '../../shared/languages';
import { translateKnownProductName } from '../../shared/productNames';

interface LanguageState {
  revision: number;
  currentLang: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  productName: (text:string) => string;
}

const cache = new Map<string, string>();
const pending = new Map<string,{language:Language;kind:'text'|'product_name';values:Set<string>}>();
const attempted = new Set<string>();
const retries=new Map<string,number>();
let scheduled = false;
function queueTranslation(text: string, language: Language,kind:'text'|'product_name'='text') {
  const key = `${language}:${text}`;
  if (attempted.has(key)) return;
  attempted.add(key);
  const group=`${language}:${kind}`;
  if (!pending.has(group)) pending.set(group,{language,kind,values:new Set()});
  pending.get(group)!.values.add(text);
  if (scheduled) return;
  scheduled = true;
  setTimeout(async () => {
    scheduled = false;
    const batches = [...pending.values()];
    pending.clear();
    for (const {language:lang,kind,values} of batches) {
      const texts = [...values];
      for (let start = 0; start < texts.length; start += 100) {
        const batch = texts.slice(start, start + 100);
        try {
          const response = await fetch('/api/ai/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(120000),
            body: JSON.stringify({ text: batch, sourceLang: 'auto', targetLang: lang,kind }),
          });
          if (!response.ok) throw new Error('Translation unavailable');
          const data = await response.json();
          if (!Array.isArray(data.translatedText) || data.translatedText.length !== batch.length || data.translatedText.some(value=>typeof value!=='string' || !value.trim())) throw new Error('Invalid translation response');
          batch.forEach((value, index) => cache.set(`${lang}:${value}`, data.translatedText[index]));
          useLanguageStore.setState(state => ({ revision: state.revision + 1 }));
        } catch {
          // A temporary backend failure should not permanently freeze a name in English.
          batch.forEach(value=>{const key=`${lang}:${value}`,count=(retries.get(key)||0)+1;retries.set(key,count);if(count<=2)setTimeout(()=>{attempted.delete(key);queueTranslation(value,lang,kind);},count*1500);});
        }
      }
    }
  }, 50);
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      revision: 0,
      currentLang: 'en',
      setLanguage: (lang) => {
        if (lang in LANGUAGE_NAMES) { attempted.clear(); set({ currentLang: lang }); }
      },
      t: (text: string) => {
        const { currentLang } = get();
        const local = translateTextFn(text, currentLang);
        const source = text ? detectTextLanguage(text) : 'en';
        if (text && local === text && source !== currentLang && (/[\p{L}]/u.test(text)) && !['A', 'T', 'TIORKHALI', 'MART', 'TIORKHALI MART', 'Mahim Ali Sekh', '&times;'].includes(text)) {
          const translated = cache.get(`${currentLang}:${text}`);
          if (translated) return translated;
          queueTranslation(text, currentLang);
        }
        return local;
      },
      productName:(text:string)=>{
        const {currentLang}=get();const known=translateKnownProductName(text,currentLang);
        if(known.complete)return known.text;
        const cached=cache.get(`${currentLang}:${text}`);if(cached)return cached;
        if(text && detectTextLanguage(text)!==currentLang)queueTranslation(text,currentLang,'product_name');
        return known.text;
      },
    }),
    { name: 'aarohan-language', partialize: state => ({ currentLang: state.currentLang }),
      merge: (saved, current) => {
        const lang = (saved as Partial<LanguageState>)?.currentLang;
        return { ...current, currentLang: lang && lang in LANGUAGE_NAMES ? lang : 'en' };
      } }
  )
);

export { LANGUAGE_NAMES };
export type { Language };
// Keep backward compat alias
export const useTranslate = () => {
  useLanguageStore(state => state.currentLang);
  useLanguageStore(state => state.revision);
  return useLanguageStore(state => state.t);
};
