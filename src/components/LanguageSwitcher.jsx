import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' }
];

export default function LanguageSwitcher({ showLabel = true, className = '' }) {
  const { i18n } = useTranslation();

  const handleLanguageChange = async (languageCode) => {
    await i18n.changeLanguage(languageCode);
    localStorage.setItem('userLanguage', languageCode);
    
    // Update user preferences in database if user is logged in
    try {
      const { base44 } = await import('@/api/base44Client');
      const user = await base44.auth.me();
      if (user) {
        const prefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
        if (prefs.length > 0) {
          await base44.entities.UserPreferences.update(prefs[0].id, {
            ...prefs[0],
            language: languageCode
          });
        } else {
          await base44.entities.UserPreferences.create({
            user_email: user.email,
            language: languageCode
          });
        }
      }
    } catch (error) {
      console.error('Error updating language preference:', error);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && <Globe className="w-4 h-4 text-gray-600" />}
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-full sm:w-auto h-11 sm:h-12 rounded-2xl border-gray-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                {lang.nativeName}
                {lang.code !== lang.nativeName && (
                  <span className="text-xs text-gray-500">({lang.name})</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}