import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Brain, TrendingUp, AlertCircle, Lightbulb, Heart, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Insights() {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', selectedProfile],
    queryFn: async () => {
      const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
      if (!profileId) return [];
      return base44.entities.VitalMeasurement.filter({ profile_id: profileId }, '-measured_at', 30);
    },
    enabled: profiles.length > 0,
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['labResults', selectedProfile],
    queryFn: async () => {
      const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
      if (!profileId) return [];
      return base44.entities.LabResult.filter({ profile_id: profileId }, '-test_date', 20);
    },
    enabled: profiles.length > 0,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', selectedProfile],
    queryFn: async () => {
      const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
      if (!profileId) return [];
      return base44.entities.Medication.filter({ profile_id: profileId, is_active: true });
    },
    enabled: profiles.length > 0,
  });

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
      const profile = profiles.find(p => p.id === profileId);

      const vitalsData = vitals.map(v => `${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`} ${v.unit}`).join(', ');
      const labData = labResults.map(l => `${l.test_name}: ${l.value} ${l.unit} (${l.flag})`).join(', ');
      const medsData = medications.map(m => `${m.medication_name} ${m.dosage}`).join(', ');

      const prompt = `As a health insights AI, analyze the following health data for ${profile?.full_name} and provide:
1. Overall health summary
2. Key findings and trends
3. Areas of concern (if any)
4. Personalized health recommendations
5. Diet suggestions
6. Exercise recommendations

Health Data:
- Vitals (last 30 measurements): ${vitalsData || 'None'}
- Lab Results (last 20): ${labData || 'None'}
- Current Medications: ${medsData || 'None'}
- Age: ${profile?.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'Unknown'}
- Gender: ${profile?.gender || 'Unknown'}
- Blood Group: ${profile?.blood_group || 'Unknown'}

Provide clear, actionable insights in a friendly tone.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      setInsights(response);
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getAbnormalResults = () => {
    return labResults.filter(r => r.flag !== 'normal');
  };

  const abnormalResults = getAbnormalResults();

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Mobile-First Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
          💡 Insights
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">Smart health analysis</p>
      </div>

      {/* Profile Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Select value={selectedProfile || 'self'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full h-11 sm:h-12 rounded-2xl border-gray-200 text-xs sm:text-sm">
            <SelectValue placeholder="Profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map(profile => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={generateInsights}
          disabled={generating || vitals.length === 0}
          className="bg-[#EDE6F7] hover:bg-[#DDD6E7] text-[#0A0A0A] rounded-2xl font-semibold active-press shadow-lg h-11 sm:h-12"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {generating ? 'Analyzing...' : 'Generate Insights'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#9BB4FF' }}>
          <CardContent className="p-3 sm:p-4">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A0A0A] mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-[#0A0A0A]">{vitals.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">Vitals</p>
          </CardContent>
        </Card>

        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#EFF1ED' }}>
          <CardContent className="p-3 sm:p-4">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A0A0A] mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-[#0A0A0A]">{labResults.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">Labs</p>
          </CardContent>
        </Card>

        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#F7C9A3' }}>
          <CardContent className="p-3 sm:p-4">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A0A0A] mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-[#0A0A0A]">{abnormalResults.length}</p>
            <p className="text-xs text-[#0A0A0A] opacity-80">Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Abnormal Results */}
      {abnormalResults.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4 sm:mb-6">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-red-600 text-sm sm:text-base font-semibold">
              <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5" />
              Abnormal Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              {abnormalResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 sm:p-4 bg-red-50 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0A0A0A] text-sm truncate">{result.test_name}</p>
                    <p className="text-xs text-gray-600">
                      {result.value} {result.unit}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs rounded-xl flex-shrink-0">
                    {result.flag}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-700 mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-50 rounded-2xl">
              ⚠️ Consult your healthcare provider
            </p>
          </CardContent>
        </Card>
      )}

      {/* Health Insights */}
      {insights && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4" style={{ backgroundColor: '#EDE6F7' }}>
            <CardTitle className="flex items-center gap-2 text-[#0A0A0A] text-sm sm:text-base">
              <Brain className="w-4 sm:w-5 h-4 sm:h-5" />
              Health Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="prose prose-sm sm:prose-base max-w-none">
              <div className="whitespace-pre-wrap text-[#0A0A0A] leading-relaxed text-sm">
                {insights}
              </div>
            </div>
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-[#E9F46A] rounded-2xl">
              <p className="text-xs text-[#0A0A0A] flex items-start gap-2">
                <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  For informational purposes only. Always consult healthcare professionals.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!insights && vitals.length === 0 && labResults.length === 0 && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardContent className="p-8 sm:p-12 text-center">
            <Brain className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-[#0A0A0A] mb-2">No Data</h3>
            <p className="text-sm text-gray-600">
              Log vitals and labs to get insights
            </p>
          </CardContent>
        </Card>
      )}

      {!insights && (vitals.length > 0 || labResults.length > 0) && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl" style={{ backgroundColor: '#EDE6F7' }}>
          <CardContent className="p-8 sm:p-12 text-center">
            <Sparkles className="w-12 sm:w-16 h-12 sm:h-16 text-purple-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-[#0A0A0A] mb-2">Ready for Insights</h3>
            <p className="text-sm text-gray-700">
              Tap "Generate Insights" to get recommendations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}