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

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
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
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1">Health Insights</h1>
        <p className="text-sm text-gray-600">AI-powered health analysis and recommendations</p>
      </div>

      {/* Profile Selector */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedProfile || 'self'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-64 rounded-xl border-gray-200">
            <SelectValue placeholder="Select Profile" />
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
          className="bg-[#EDE6F7] hover:bg-[#DDD6E7] text-[#0A0A0A] rounded-xl font-semibold"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {generating ? 'Generating...' : 'Generate AI Insights'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#9BB4FF' }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-[#0A0A0A]" />
              <div>
                <p className="text-xs text-[#0A0A0A] opacity-80">Vitals Logged</p>
                <p className="text-2xl font-bold text-[#0A0A0A]">{vitals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#EFF1ED' }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-[#0A0A0A]" />
              <div>
                <p className="text-xs text-[#0A0A0A] opacity-80">Lab Tests</p>
                <p className="text-2xl font-bold text-[#0A0A0A]">{labResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#F7C9A3' }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-[#0A0A0A]" />
              <div>
                <p className="text-xs text-[#0A0A0A] opacity-80">Alerts</p>
                <p className="text-2xl font-bold text-[#0A0A0A]">{abnormalResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abnormal Results */}
      {abnormalResults.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl mb-6">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-red-600 text-lg font-semibold">
              <AlertCircle className="w-5 h-5" />
              Abnormal Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {abnormalResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-[#0A0A0A] text-sm">{result.test_name}</p>
                    <p className="text-xs text-gray-600">
                      {result.value} {result.unit} • Ref: {result.reference_low}-{result.reference_high}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs rounded-lg">
                    {result.flag}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-700 mt-4 p-3 bg-yellow-50 rounded-xl">
              ⚠️ Please consult with your healthcare provider about these results
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100" style={{ backgroundColor: '#EDE6F7' }}>
            <CardTitle className="flex items-center gap-2 text-[#0A0A0A]">
              <Brain className="w-5 h-5" />
              AI-Generated Health Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-[#0A0A0A] leading-relaxed text-sm">
                {insights}
              </div>
            </div>
            <div className="mt-6 p-4 bg-[#E9F46A] rounded-xl">
              <p className="text-xs text-[#0A0A0A] flex items-start gap-2">
                <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  These insights are AI-generated and for informational purposes only. 
                  Always consult with qualified healthcare professionals for medical advice.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!insights && vitals.length === 0 && labResults.length === 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">No Data Available</h3>
            <p className="text-sm text-gray-600 mb-6">
              Start logging vitals and lab results to get personalized AI insights
            </p>
          </CardContent>
        </Card>
      )}

      {!insights && (vitals.length > 0 || labResults.length > 0) && (
        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#EDE6F7' }}>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">Ready to Generate Insights</h3>
            <p className="text-sm text-gray-700 mb-6">
              Click the "Generate AI Insights" button to get personalized health recommendations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}