import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Globe } from 'lucide-react';
import { languages } from './i18n/translations';

export default function LanguageSelector({ onLanguageSelect, selectedLanguage }) {
  const [selected, setSelected] = useState(selectedLanguage || 'en');

  const handleSelect = (code) => {
    setSelected(code);
    if (onLanguageSelect) {
      onLanguageSelect(code);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Globe className="w-16 h-16 mx-auto mb-4 text-[#E9F46A]" />
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">
          {selected === 'en' && 'Choose Your Language'}
          {selected === 'hi' && 'अपनी भाषा चुनें'}
          {selected === 'te' && 'మీ భాషను ఎంచుకోండి'}
        </h2>
        <p className="text-sm text-gray-600">
          {selected === 'en' && 'Select your preferred language to continue'}
          {selected === 'hi' && 'जारी रखने के लिए अपनी पसंदीदा भाषा चुनें'}
          {selected === 'te' && 'కొనసాగించడానికి మీ ఇష్టమైన భాషను ఎంచుకోండి'}
        </p>
      </div>

      <div className="grid gap-3">
        {languages.map((lang) => (
          <Card
            key={lang.code}
            className={`cursor-pointer transition-all border-2 rounded-2xl card-interactive ${
              selected === lang.code
                ? 'border-[#E9F46A] bg-[#E9F46A]/10'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSelect(lang.code)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{lang.flag}</span>
                <div>
                  <p className="font-semibold text-[#0A0A0A]">{lang.nativeName}</p>
                  <p className="text-xs text-gray-600">{lang.name}</p>
                </div>
              </div>
              {selected === lang.code && (
                <div className="w-6 h-6 rounded-full bg-[#E9F46A] flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#0A0A0A]" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}