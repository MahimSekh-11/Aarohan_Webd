import React from 'react';
import { useLanguageStore } from '../store/useLanguageStore';

interface TranslateProps {
  children: string;
}

export function Translate({ children }: TranslateProps) {
  const translate = useT();
  return <>{translate(children)}</>;
}

// Hook: const t = useT();  then  t('Hello')
export function useT() {
  useLanguageStore(state => state.currentLang);
  useLanguageStore(state => state.revision);
  return useLanguageStore(state => state.t);
}

// Keep old name for compatibility
export const useTranslate = useT;
