import { en } from './translations/en';
import { zhTW } from './translations/zh-TW';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';

export type TranslationKey = keyof typeof en;
export type NestedTranslationKey<T> = T extends object ? {
  [K in keyof T]: T[K] extends object ? `${string & K}.${NestedTranslationKey<T[K]>}` : string & K;
}[keyof T] : never;

export type AllTranslationKeys = NestedTranslationKey<typeof en>;

const translations = {
  en,
  'zh-TW': zhTW
};

export class I18n {
  private static currentLanguage: string = DEFAULT_LANGUAGE;
  private static listeners: Array<() => void> = [];
  
  static addListener(listener: () => void) {
    this.listeners.push(listener);
  }
  
  static removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  private static notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
  
  static setLanguage(language: string) {
    if (SUPPORTED_LANGUAGES.some(lang => lang.code === language)) {
      this.currentLanguage = language;
      localStorage.setItem('selectedLanguage', language);
      this.notifyListeners();
    }
  }
  
  static getCurrentLanguage(): string {
    return this.currentLanguage;
  }
  
  static initializeLanguage() {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLanguage)) {
      this.currentLanguage = savedLanguage;
    }
  }
  
  static t(key: string): string {
    const translation = translations[this.currentLanguage as keyof typeof translations] || translations.en;
    
    const keys = key.split('.');
    let value: any = translation;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    // Fallback to English if translation not found
    if (this.currentLanguage !== 'en') {
      const englishTranslation = translations.en;
      let englishValue: any = englishTranslation;
      
      for (const k of keys) {
        englishValue = englishValue?.[k];
        if (englishValue === undefined) break;
      }
      
      if (typeof englishValue === 'string') {
        return englishValue;
      }
    }
    
    // Return key if no translation found
    return key;
  }
}

// Initialize language from localStorage
I18n.initializeLanguage();

// Export convenience function
export const t = (key: string) => I18n.t(key);

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './languages';