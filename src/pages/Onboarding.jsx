import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, ArrowRight } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import { createPageUrl } from '../utils';
import i18n from '../components/i18n/i18nSetup';
import { translations } from '../components/i18n/translations';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState('en');
  const [profileData, setProfileData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    height: '',
    relationship: 'self'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.Profile.filter({
        created_by: user.email,
        relationship: 'self'
      });
      
      if (profiles.length > 0) {
        navigate(createPageUrl('OnboardingDocUpload'));
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const handleLanguageSelect = async (selectedLang) => {
    setLanguage(selectedLang);
    await i18n.changeLanguage(selectedLang);
    localStorage.setItem('userLanguage', selectedLang);
    
    // Save language preference
    try {
      const user = await base44.auth.me();
      const prefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
      
      if (prefs.length > 0) {
        await base44.entities.UserPreferences.update(prefs[0].id, {
          ...prefs[0],
          language: selectedLang
        });
      } else {
        await base44.entities.UserPreferences.create({
          user_email: user.email,
          language: selectedLang
        });
      }
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const handleCreateProfile = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.Profile.create({
        ...profileData,
        created_by: user.email
      });

      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const t = translations[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F4F2] to-[#E8E8E3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0A0A0A] rounded-2xl mb-4">
            <Activity className="w-8 h-8 text-[#E9F46A]" />
          </div>
          <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">{t.onboarding.welcome}</h1>
          <p className="text-gray-600">{t.onboarding.subtitle}</p>
        </div>

        {/* Step 1: Language Selection */}
        {step === 1 && (
          <Card className="border-0 card-shadow rounded-3xl">
            <CardContent className="p-6">
              <LanguageSelector
                selectedLanguage={language}
                onLanguageSelect={handleLanguageSelect}
              />
              <Button
                onClick={() => setStep(2)}
                className="w-full mt-6 bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl h-12 text-base font-semibold shadow-lg active-press"
              >
                {t.onboarding.get_started}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Profile Creation */}
        {step === 2 && (
          <Card className="border-0 card-shadow rounded-3xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">{t.onboarding.create_profile}</h2>
              <p className="text-sm text-gray-600 mb-6">{t.onboarding.profile_description}</p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">{t.profiles?.full_name || 'Full Name'} *</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="h-11 rounded-2xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_of_birth">{t.profiles?.date_of_birth || 'Date of Birth'}</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={profileData.date_of_birth}
                      onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender">{t.profiles?.gender || 'Gender'}</Label>
                    <Select
                      value={profileData.gender}
                      onValueChange={(value) => setProfileData({ ...profileData, gender: value })}
                    >
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder={t.common?.select || 'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t.profiles?.male || 'Male'}</SelectItem>
                        <SelectItem value="female">{t.profiles?.female || 'Female'}</SelectItem>
                        <SelectItem value="other">{t.common?.other || 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blood_group">{t.profiles?.blood_group || 'Blood Group'}</Label>
                    <Select
                      value={profileData.blood_group}
                      onValueChange={(value) => setProfileData({ ...profileData, blood_group: value })}
                    >
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder={t.common?.select || 'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                          <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="height">{t.profiles?.height || 'Height'} (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={profileData.height}
                      onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
                      placeholder="170"
                      className="h-11 rounded-2xl"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-2xl h-11"
                  >
                    {t.common.back}
                  </Button>
                  <Button
                    onClick={handleCreateProfile}
                    disabled={loading || !profileData.full_name}
                    className="flex-1 bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl h-11 font-semibold shadow-lg active-press"
                  >
                    {loading ? t.common.loading : t.common.done}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}