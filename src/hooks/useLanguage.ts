import { useState, useEffect, useCallback } from 'react';
import { I18n, SUPPORTED_LANGUAGES } from '../i18n';
import { systemSettingsAPI } from '../services/api';

export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = useState(I18n.getCurrentLanguage());
  const [loading, setLoading] = useState(false);

  // Function to change language
  const changeLanguage = useCallback(async (language: string) => {
    if (!SUPPORTED_LANGUAGES.some(lang => lang.code === language)) {
      console.error('Unsupported language:', language);
      return;
    }

    setLoading(true);
    try {
      // Update local state
      I18n.setLanguage(language);
      setCurrentLanguage(language);
      
      // Update system setting if user is admin
      try {
        await systemSettingsAPI.updateSetting('system_language', language);
      } catch (error) {
        // Not an admin or API error - still update locally
        console.warn('Could not update system language setting:', error);
      }
      
      // Force a page reload to ensure all components update while staying on current page
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      window.location.replace(window.location.origin + currentPath);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load system language on mount and periodically check for changes
  useEffect(() => {
    const loadSystemLanguage = async () => {
      try {
        const response = await systemSettingsAPI.getSystemLanguage();
        const systemLang = response.language;
        const currentLang = I18n.getCurrentLanguage();
        
        if (systemLang && systemLang !== currentLang) {
          console.log('System language changed from', currentLang, 'to', systemLang);
          I18n.setLanguage(systemLang);
          setCurrentLanguage(systemLang);
          
          // Reload the page to apply language changes to all components
          setTimeout(() => {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            window.location.replace(window.location.origin + currentPath);
          }, 100);
        }
      } catch (error) {
        // Fallback to stored language or default
        console.warn('Could not load system language, using stored/default:', error);
      }
    };

    // Load system language immediately
    loadSystemLanguage();

    // Check for language changes every 2 seconds
    const interval = setInterval(loadSystemLanguage, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    currentLanguage,
    changeLanguage,
    loading,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
};