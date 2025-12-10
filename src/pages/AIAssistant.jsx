import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, TrendingUp, Heart, Activity, Pill, AlertCircle, Sparkles, MessageSquare, MapPin, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import AIHealthChat from '../components/AIHealthChat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AIAssistant() {
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
    <div className="px-4 md:px-6 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0A0A0A] mb-1">Flux Assistant</h1>
        <p className="text-sm text-gray-600">Personalized insights and health guidance</p>
      </div>

      {/* Profile Selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select value={selectedProfile || ''} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-64 rounded-2xl border-gray-200">
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

        <div className="flex gap-2">
          <Button
            onClick={() => setChatOpen(true)}
            className="flex-1 sm:flex-none bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl font-semibold">

            <MessageSquare className="w-4 h-4 mr-2" />
            Start Chat
          </Button>
          <Button
            onClick={generateHealthSummary}
            disabled={generating || !selectedProfile}
            className="flex-1 sm:flex-none bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl font-semibold">

            {generating ?
            <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </> :

            <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Summary
              </>
            }
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#9BB4FF' }}>
          <CardContent className="p-4">
            <Activity className="w-5 h-5 text-[#0A0A0A] mb-2" />
            <p className="text-2xl font-bold text-[#0A0A0A]">{vitals.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">Vitals Logged</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#F7C9A3' }}>
          <CardContent className="p-4">
            <Pill className="w-5 h-5 text-[#0A0A0A] mb-2" />
            <p className="text-2xl font-bold text-[#0A0A0A]">{medications.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">Active Meds</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#EFF1ED' }}>
          <CardContent className="p-4">
            <Heart className="w-5 h-5 text-[#0A0A0A] mb-2" />
            <p className="text-2xl font-bold text-[#0A0A0A]">{labResults.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">Lab Tests</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#EDE6F7' }}>
          <CardContent className="p-4">
            <AlertCircle className="w-5 h-5 text-[#0A0A0A] mb-2" />
            <p className="text-2xl font-bold text-[#0A0A0A]">{abnormalLabs.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Health Summary */}
      {summary &&
      <Card className="border-0 shadow-sm rounded-2xl mb-6">
          <CardHeader className="border-b border-gray-100" style={{ backgroundColor: '#E9F46A' }}>
            <CardTitle className="flex items-center gap-2 text-[#0A0A0A] text-lg">
              <Brain className="w-5 h-5" />
              AI Health Summary
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
            <h3 className="text-base md:text-lg font-semibold text-[#0A0A0A] mb-2">Get Your Health Summary</h3>
            <p className="text-sm text-gray-700 mb-6">
              Click "Generate Summary" to get personalized health insights, trend analysis, and recommendations based on your data.
            </p>
          </CardContent>
        </Card>
      }

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Latest Vitals */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-[#0A0A0A]">Recent Vitals</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {latestVitals.length === 0 ?
            <p className="text-center text-gray-600 py-6 text-sm">No vitals logged yet</p> :

            <div className="space-y-2">
                {latestVitals.map((vital) =>
              <div key={vital.id} className="flex justify-between items-center p-3 bg-[#F4F4F2] rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A] capitalize">
                        {vital.vital_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(vital.measured_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#0A0A0A]">
                      {vital.value || `${vital.systolic}/${vital.diastolic}`} {vital.unit}
                    </p>
                  </div>
              )}
              </div>
            }
          </CardContent>
        </Card>

        {/* Current Medications */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-[#0A0A0A]">Current Medications</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {medications.length === 0 ?
            <p className="text-center text-gray-600 py-6 text-sm">No active medications</p> :

            <div className="space-y-2">
                {medications.slice(0, 5).map((med) =>
              <div key={med.id} className="p-3 bg-[#F4F4F2] rounded-xl">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{med.medication_name}</p>
                    <p className="text-xs text-gray-600">{med.dosage} • {med.frequency.replace(/_/g, ' ')}</p>
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
              <h3 className="text-base font-semibold text-white mb-1">Find Doctors Nearby</h3>
              <p className="text-sm text-white/80 mb-4">
                Connect with healthcare professionals in your area (Coming Soon)
              </p>
              <Button disabled className="bg-white/20 hover:bg-white/30 text-white rounded-xl border-none">
                Search Doctors
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-3xl h-[700px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b border-gray-200" style={{ backgroundColor: '#E9F46A' }}>
            <DialogTitle className="flex items-center gap-2 text-[#0A0A0A]">
              <Brain className="w-5 h-5" />
              AI Health Chat
            </DialogTitle>
            <p className="text-xs text-gray-700 mt-1">
              Ask questions about your health data and get personalized insights
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedProfile && <AIHealthChat profileId={selectedProfile} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}