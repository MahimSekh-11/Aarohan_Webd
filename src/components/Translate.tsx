import React from 'react';
import { useLanguageStore } from '../store/useLanguageStore';

interface TranslateProps {
  children: string;
}

export function Translate({ children }: TranslateProps) {
  const translate = useLanguageStore(state => state.translate);
  return <>{translate(children)}</>;
}

export function useTranslate() {
  return useLanguageStore(state => state.translate);
}
