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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Health Insights</h1>
        <p className="text-slate-600">AI-powered health analysis and recommendations</p>
      </div>

      {/* Profile Selector */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Select value={selectedProfile || 'self'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-64">
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
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {generating ? 'Generating Insights...' : 'Generate AI Insights'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Vitals Logged</p>
                <p className="text-3xl font-bold">{vitals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-teal-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Lab Tests</p>
                <p className="text-3xl font-bold">{labResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Alerts</p>
                <p className="text-3xl font-bold">{abnormalResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abnormal Results */}
      {abnormalResults.length > 0 && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-8">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Abnormal Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {abnormalResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="font-medium text-slate-900">{result.test_name}</p>
                    <p className="text-sm text-slate-600">
                      {result.value} {result.unit} • Reference: {result.reference_low}-{result.reference_high}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                    {result.flag}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              ⚠️ Please consult with your healthcare provider about these results
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              AI-Generated Health Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {insights}
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 flex items-start gap-2">
                <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Data Available</h3>
            <p className="text-slate-600 mb-6">
              Start logging vitals and lab results to get personalized AI insights
            </p>
          </CardContent>
        </Card>
      )}

      {!insights && (vitals.length > 0 || labResults.length > 0) && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Ready to Generate Insights</h3>
            <p className="text-slate-600 mb-6">
              Click the "Generate AI Insights" button to get personalized health recommendations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}