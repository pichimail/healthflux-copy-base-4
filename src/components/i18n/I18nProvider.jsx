import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18nSetup';
import { base44 } from '@/api/base44Client';

export default function I18nProvider({ children }) {
  useEffect(() => {
    loadUserLanguage();
  }, []);

  const loadUserLanguage = async () => {
    try {
      const user = await base44.auth.me();
      const prefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
      
      if (prefs.length > 0 && prefs[0].language) {
        await i18n.changeLanguage(prefs[0].language);
        localStorage.setItem('userLanguage', prefs[0].language);
      }
    } catch (error) {
      // User not logged in or preferences not set
      const savedLang = localStorage.getItem('userLanguage');
      if (savedLang) {
        await i18n.changeLanguage(savedLang);
      }
    }
  };

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}