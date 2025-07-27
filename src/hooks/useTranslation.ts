import { useState, useEffect } from 'react';
import { I18n } from '../i18n';

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState(I18n.getCurrentLanguage());

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(I18n.getCurrentLanguage());
    };

    I18n.addListener(handleLanguageChange);

    return () => {
      I18n.removeListener(handleLanguageChange);
    };
  }, []);

  const t = (key: string) => I18n.t(key);

  return { t, currentLanguage };
};