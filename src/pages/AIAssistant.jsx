import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, TrendingUp, Heart, Activity, Pill, AlertCircle, Sparkles, MessageSquare, MapPin, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import AIHealthChat from '../components/AIHealthChat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AIAssistant() {
  const { t } = useTranslation();
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date')
  });

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile) {
      const selfProfile = profiles.find((p) => p.relationship === 'self');
      setSelectedProfile(selfProfile?.id || profiles[0].id);
    }
  }, [profiles]);

  const currentProfile = profiles.find((p) => p.id === selectedProfile);

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', selectedProfile],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: selectedProfile }, '-measured_at', 30),
    enabled: !!selectedProfile
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['labResults', selectedProfile],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: selectedProfile }, '-test_date', 20),
    enabled: !!selectedProfile
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', selectedProfile],
    queryFn: () => base44.entities.Medication.filter({ profile_id: selectedProfile, is_active: true }),
    enabled: !!selectedProfile
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', selectedProfile],
    queryFn: () => base44.entities.MedicalDocument.filter({ profile_id: selectedProfile }, '-created_date', 10),
    enabled: !!selectedProfile
  });

  const generateHealthSummary = async () => {
    setGenerating(true);
    try {
      const vitalsData = vitals.map((v) => `${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`} ${v.unit}`).join(', ');
      const labData = labResults.map((l) => `${l.test_name}: ${l.value} ${l.unit} (${l.flag})`).join(', ');
      const medsData = medications.map((m) => `${m.medication_name} ${m.dosage}`).join(', ');

      const prompt = `As a health AI assistant, provide a comprehensive health summary for ${currentProfile?.full_name}:

Health Data:
- Age: ${currentProfile?.date_of_birth ? new Date().getFullYear() - new Date(currentProfile.date_of_birth).getFullYear() : 'Unknown'}
- Gender: ${currentProfile?.gender || 'Unknown'}
- Blood Group: ${currentProfile?.blood_group || 'Unknown'}
- Allergies: ${currentProfile?.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${currentProfile?.chronic_conditions?.join(', ') || 'None'}
- Current Medications: ${medsData || 'None'}
- Recent Vitals (30 days): ${vitalsData || 'None'}
- Recent Lab Results (20 tests): ${labData || 'None'}

Generate:
1. **Overall Health Status** - Brief assessment
2. **Key Findings** - Important observations from data
3. **Vital Trends** - Blood pressure, weight, heart rate patterns
4. **Lab Analysis** - Notable results and what they mean
5. **Current Medications** - List with purposes
6. **Lifestyle Recommendations** - Diet, exercise, sleep
7. **Action Items** - What to monitor or discuss with doctor

Keep the language simple, empathetic, and actionable.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setSummary(response);
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary('Failed to generate health summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const abnormalLabs = labResults.filter((r) => r.flag !== 'normal');
  const latestVitals = vitals.slice(0, 5);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 max-w-7xl mx-auto">
      {/* Mobile-First Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">🤖 {t('ai_assistant.title')}</h1>
        <p className="text-xs sm:text-sm text-gray-600">{t('ai_assistant.subtitle')}</p>
      </div>

      {/* Profile Selector */}
      <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Select value={selectedProfile || ''} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full h-11 sm:h-12 rounded-2xl border-gray-200">
            <SelectValue placeholder="Select Profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((profile) =>
            <SelectItem key={profile.id} value={profile.id}>
                {profile.full_name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setChatOpen(true)}
            className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl font-semibold active-press shadow-lg h-11 sm:h-12">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t('ai_assistant.chat')}
          </Button>
          <Button
            onClick={generateHealthSummary}
            disabled={generating || !selectedProfile}
            className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl font-semibold active-press shadow-lg h-11 sm:h-12">
            {generating ?
            <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">{t('ai_assistant.analyzing')}</span>
              </> :
            <>
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('ai_assistant.summary')}</span>
                <span className="sm:hidden">{t('ai_assistant.gen')}</span>
              </>
            }
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#9BB4FF' }}>
          <CardContent className="p-3 sm:p-4">
            <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-[#0A0A0A] mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-[#0A0A0A]">{vitals.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">{t('ai_assistant.vitals')}</p>
          </CardContent>
        </Card>

        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#F7C9A3' }}>
          <CardContent className="p-3 sm:p-4">
            <Pill className="w-4 sm:w-5 h-4 sm:h-5 text-[#0A0A0A] mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-[#0A0A0A]">{medications.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">{t('ai_assistant.meds')}</p>
          </CardContent>
        </Card>

        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#EFF1ED' }}>
          <CardContent className="p-3 sm:p-4">
            <Heart className="w-4 sm:w-5 h-4 sm:h-5 text-[#0A0A0A] mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-[#0A0A0A]">{labResults.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">{t('ai_assistant.labs')}</p>
          </CardContent>
        </Card>

        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#EDE6F7' }}>
          <CardContent className="p-3 sm:p-4">
            <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-[#0A0A0A] mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-[#0A0A0A]">{abnormalLabs.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">{t('ai_assistant.alerts')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Summary */}
      {summary &&
      <Card className="border-0 shadow-sm rounded-2xl mb-6">
          <CardHeader className="border-b border-gray-100" style={{ backgroundColor: '#E9F46A' }}>
            <CardTitle className="flex items-center gap-2 text-[#0A0A0A] text-lg">
              <Brain className="w-5 h-5" />
              {t('ai_assistant.health_summary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="prose prose-sm md:prose-base max-w-none">
              <div className="whitespace-pre-wrap text-[#0A0A0A] leading-relaxed text-sm md:text-base">
                {summary}
              </div>
            </div>
          </CardContent>
        </Card>
      }

      {!summary && !generating &&
      <Card className="border-0 shadow-sm rounded-2xl mb-6" style={{ backgroundColor: '#EDE6F7' }}>
          <CardContent className="p-8 md:p-12 text-center">
            <Brain className="w-12 md:w-16 h-12 md:h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-[#0A0A0A] mb-2">{t('ai_assistant.get_summary')}</h3>
            <p className="text-sm text-gray-700 mb-6">
              {t('ai_assistant.summary_desc')}
            </p>
          </CardContent>
        </Card>
      }

      {/* Recent Activity */}
      <div className="grid gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Latest Vitals */}
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm font-semibold text-[#0A0A0A]">{t('ai_assistant.recent_vitals')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {latestVitals.length === 0 ?
            <p className="text-center text-gray-600 py-6 text-xs sm:text-sm">{t('ai_assistant.no_vitals')}</p> :

            <div className="space-y-2">
                {latestVitals.map((vital) =>
              <div key={vital.id} className="flex justify-between items-center p-2 sm:p-3 bg-[#F4F4F2] rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-[#0A0A0A] capitalize truncate">
                        {vital.vital_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(vital.measured_at), 'MMM d')}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#0A0A0A] flex-shrink-0">
                      {vital.value || `${vital.systolic}/${vital.diastolic}`}
                    </p>
                  </div>
              )}
              </div>
            }
          </CardContent>
        </Card>

        {/* Current Medications */}
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm font-semibold text-[#0A0A0A]">{t('ai_assistant.medications')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {medications.length === 0 ?
            <p className="text-center text-gray-600 py-6 text-xs sm:text-sm">{t('ai_assistant.no_meds')}</p> :

            <div className="space-y-2">
                {medications.slice(0, 5).map((med) =>
              <div key={med.id} className="p-2 sm:p-3 bg-[#F4F4F2] rounded-2xl">
                    <p className="text-xs sm:text-sm font-semibold text-[#0A0A0A] truncate">{med.medication_name}</p>
                    <p className="text-xs text-gray-600 truncate">{med.dosage}</p>
                  </div>
              )}
              </div>
            }
          </CardContent>
        </Card>
      </div>

      {/* Doctors Nearby Placeholder */}
      <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#0B5A46' }}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">{t('ai_assistant.find_doctors')}</h3>
              <p className="text-sm text-white/80 mb-4">
                {t('ai_assistant.doctors_desc')}
              </p>
              <Button disabled className="bg-white/20 hover:bg-white/30 text-white rounded-xl border-none">
                {t('ai_assistant.search_doctors')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-3xl h-[700px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b border-gray-200" style={{ backgroundColor: '#E9F46A' }}>
            <DialogTitle className="flex items-center gap-2 text-[#0A0A0A]">
              <Brain className="w-5 h-5" />
              {t('ai_assistant.health_chat')}
            </DialogTitle>
            <p className="text-xs text-gray-700 mt-1">
              {t('ai_assistant.chat_desc')}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedProfile && <AIHealthChat profileId={selectedProfile} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}