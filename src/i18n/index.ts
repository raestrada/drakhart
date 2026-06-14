import { en } from './en';
import { es } from './es';

type Lang = 'en' | 'es';

const dictionaries: Record<Lang, typeof en> = { en, es };

let currentLang: Lang = 'en';

function detectLanguage(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.slice(0, 2);
  return lang === 'es' ? 'es' : 'en';
}

export function initI18n(): void {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('drakhart_lang') : null;
  if (saved === 'en' || saved === 'es') {
    currentLang = saved;
  } else {
    currentLang = detectLanguage();
  }
}

export function setLanguage(lang: Lang): void {
  currentLang = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('drakhart_lang', lang);
  }
}

export function getLanguage(): Lang {
  return currentLang;
}

export function t(key: string): string {
  const parts = key.split('.');
  let value: unknown = dictionaries[currentLang];
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof value === 'string' ? value : key;
}
