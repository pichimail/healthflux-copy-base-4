import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, FileText, Pill, TrendingUp, Users, 
  Plus, AlertCircle, CheckCircle, ArrowRight, Brain, Sparkles, MessageSquare, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ProfileSwitcher from '../components/ProfileSwitcher';
import VitalEntryForm from '../components/VitalEntryForm';
import UploadModal from '../components/UploadModal';
import AIHealthChat from '../components/AIHealthChat';
import MedicationReminders from '../components/medications/MedicationReminders';
import DrugInteractionWarnings from '../components/medications/DrugInteractionWarnings';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [vitalDialogOpen, setVitalDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [generatingPredictions, setGeneratingPredictions] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    
    const profiles = await base44.entities.Profile.filter({ 
      relationship: 'self',
      created_by: userData.email 
    });
    
    if (profiles.length === 0) {
      window.location.href = createPageUrl('Onboarding');
      return;
    }
    
    setSelectedProfileId(profiles[0].id);
  };

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const currentProfile = allProfiles.find(p => p.id === selectedProfileId) || allProfiles[0];

  const { data: upcomingMeds = [] } = useQuery({
    queryKey: ['medications', selectedProfileId],
    queryFn: () => base44.entities.Medication.filter({ 
      profile_id: selectedProfileId,
      is_active: true 
    }, '-created_date', 5),
    enabled: !!selectedProfileId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', selectedProfileId],
    queryFn: () => base44.entities.MedicalDocument.filter({ 
      profile_id: selectedProfileId 
    }, '-created_date', 5),
    enabled: !!selectedProfileId,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', selectedProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ 
      profile_id: selectedProfileId 
    }, '-measured_at', 5),
    enabled: !!selectedProfileId,
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['labResults', selectedProfileId],
    queryFn: () => base44.entities.LabResult.filter({ 
      profile_id: selectedProfileId 
    }, '-test_date', 50),
    enabled: !!selectedProfileId,
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['insights', selectedProfileId],
    queryFn: () => base44.entities.HealthInsight.filter({ 
      profile_id: selectedProfileId 
    }, '-created_date', 10),
    enabled: !!selectedProfileId,
  });

  const generatePredictions = async () => {
    setGeneratingPredictions(true);
    try {
      await base44.functions.invoke('healthPredictions', {
        profile_id: selectedProfileId
      });
      queryClient.invalidateQueries(['insights', selectedProfileId]);
    } catch (error) {
      console.error('Predictions error:', error);
    } finally {
      setGeneratingPredictions(false);
    }
  };

  const getLatestVital = (type) => {
    return vitals.find(v => v.vital_type === type);
  };

  const latestBP = getLatestVital('blood_pressure');
  const latestWeight = getLatestVital('weight');
  const latestGlucose = getLatestVital('blood_glucose');
  const latestHR = getLatestVital('heart_rate');

  // Prepare chart data
  const bpChartData = vitals
    .filter(v => v.vital_type === 'blood_pressure')
    .slice(0, 10)
    .reverse()
    .map(v => ({
      date: format(new Date(v.measured_at), 'MM/dd'),
      systolic: v.systolic,
      diastolic: v.diastolic
    }));

  const weightChartData = vitals
    .filter(v => v.vital_type === 'weight')
    .slice(0, 10)
    .reverse()
    .map(v => ({
      date: format(new Date(v.measured_at), 'MM/dd'),
      weight: v.value
    }));

  const unreadInsights = insights.filter(i => !i.is_read);
  const criticalInsights = insights.filter(i => i.severity === 'high' || i.severity === 'critical');
  const predictionInsights = insights.filter(i => i.insight_type === 'trend_analysis');

  const stats = [
    { 
      label: 'Family Profiles', 
      value: allProfiles.length, 
      icon: Users, 
      color: 'from-blue-500 to-blue-600',
      link: 'Profiles'
    },
    { 
      label: 'Documents', 
      value: documents.length, 
      icon: FileText, 
      color: 'from-green-500 to-green-600',
      link: 'Documents'
    },
    { 
      label: 'Active Medications', 
      value: upcomingMeds.length, 
      icon: Pill, 
      color: 'from-purple-500 to-purple-600',
      link: 'Medications'
    },
    { 
      label: 'Lab Results', 
      value: labResults.length, 
      icon: Activity, 
      color: 'from-cyan-500 to-cyan-600',
      link: 'LabResults'
    },
  ];

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      {/* Mobile-First Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
                Hey, {currentProfile?.full_name.split(' ')[0]} 👋
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">Your health dashboard</p>
            </div>
            <div className="hidden sm:block">
              <ProfileSwitcher
                profiles={allProfiles}
                selectedProfile={selectedProfileId}
                onProfileChange={setSelectedProfileId}
              />
            </div>
          </div>
          
          <div className="sm:hidden">
            <ProfileSwitcher
              profiles={allProfiles}
              selectedProfile={selectedProfileId}
              onProfileChange={setSelectedProfileId}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setChatOpen(true)}
              className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl font-semibold active-press shadow-lg h-11 sm:h-12"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ask Anything</span>
              <span className="sm:hidden">Chat</span>
            </Button>
            <Button
              onClick={generatePredictions}
              disabled={generatingPredictions}
              className="bg-[#EDE6F7] hover:bg-[#DDD6E7] text-[#0A0A0A] rounded-2xl font-semibold active-press shadow-lg h-11 sm:h-12"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{generatingPredictions ? 'Analyzing...' : 'Predict'}</span>
              <span className="sm:hidden">Trends</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Drug Interaction Warnings */}
      <DrugInteractionWarnings profileId={selectedProfileId} />

      {/* Medication Reminders */}
      <MedicationReminders 
        medications={upcomingMeds} 
        profileId={selectedProfileId}
      />

      {/* Alerts Section */}
      {criticalInsights.length > 0 && (
        <div className="mb-6">
          <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-red-50 to-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0A0A0A] text-sm mb-1">Critical Health Alerts</h3>
                  <p className="text-xs text-gray-700">
                    {criticalInsights.length} item{criticalInsights.length > 1 ? 's' : ''} requiring attention
                  </p>
                </div>
                <Link to={createPageUrl('Insights')}>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 rounded-xl text-xs">
                    View All
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Hero Card - Upload Document */}
        <div
          onClick={() => setUploadDialogOpen(true)}
          className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 h-44 sm:h-52 flex flex-col relative cursor-pointer active-press card-shadow hover:shadow-lg transition-all"
          style={{ backgroundColor: '#E9F46A' }}
        >
          <div className="text-xs sm:text-sm text-[#0A0A0A] mb-1 opacity-90">
            Medical Records<br />Auto Processing
          </div>
          <div className="text-lg sm:text-2xl font-semibold text-[#0A0A0A] mt-auto">
            Upload Document
          </div>
          <div className="absolute bottom-5 sm:bottom-6 right-5 sm:right-6 w-10 h-10 sm:w-11 sm:h-11 bg-white/90 rounded-2xl flex items-center justify-center shadow-md">
            <Plus className="w-5 h-5 text-[#0A0A0A]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Vitals Card */}
          <div
            onClick={() => setVitalDialogOpen(true)}
            className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 h-36 sm:h-48 flex flex-col relative cursor-pointer active-press card-shadow hover:shadow-lg transition-all"
            style={{ backgroundColor: '#9BB4FF' }}
          >
            <div className="text-xs text-[#0A0A0A] mb-1 opacity-90">
              Track Daily<br />BP, Weight
            </div>
            <div className="text-base sm:text-xl font-semibold text-[#0A0A0A] mt-auto">
              Vitals
            </div>
            <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 rounded-2xl flex items-center justify-center shadow-md">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A0A0A]" />
            </div>
          </div>

          {/* Medications Card */}
          <Link to={createPageUrl('Medications')}>
            <div
              className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 h-36 sm:h-48 flex flex-col relative cursor-pointer active-press card-shadow hover:shadow-lg transition-all"
              style={{ backgroundColor: '#F7C9A3' }}
            >
              <div className="text-xs text-[#0A0A0A] mb-1 opacity-90">
                Med Tracking<br />Reminders
              </div>
              <div className="text-base sm:text-xl font-semibold text-[#0A0A0A] mt-auto">
                Meds
              </div>
              <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 rounded-2xl flex items-center justify-center shadow-md">
                <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A0A0A]" />
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Lab Results Card */}
          <Link to={createPageUrl('LabResults')}>
            <div
              className="rounded-2xl sm:rounded-3xl p-3 sm:p-4 h-28 sm:h-36 flex flex-col relative cursor-pointer active-press card-shadow hover:shadow-lg transition-all"
              style={{ backgroundColor: '#EDE6F7' }}
            >
              <div className="text-xs text-[#0A0A0A] mb-1 opacity-90">
                Lab<br />Tests
              </div>
              <div className="text-sm sm:text-base font-semibold text-[#0A0A0A] mt-auto">
                Labs
              </div>
              <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
              </div>
            </div>
          </Link>

          {/* Trends Card */}
          <Link to={createPageUrl('Trends')}>
            <div
              className="rounded-2xl sm:rounded-3xl p-3 sm:p-4 h-28 sm:h-36 flex flex-col relative cursor-pointer active-press card-shadow hover:shadow-lg transition-all"
              style={{ backgroundColor: '#EFF1ED' }}
            >
              <div className="text-xs text-[#0A0A0A] mb-1 opacity-90">
                Health<br />Charts
              </div>
              <div className="text-sm sm:text-base font-semibold text-[#0A0A0A] mt-auto">
                Trends
              </div>
              <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
              </div>
            </div>
          </Link>

          {/* Family Profiles Card */}
          <Link to={createPageUrl('FamilyProfiles')}>
            <div
              className="rounded-2xl sm:rounded-3xl p-3 sm:p-4 h-28 sm:h-36 flex flex-col relative cursor-pointer active-press card-shadow hover:shadow-lg transition-all"
              style={{ backgroundColor: '#0B5A46' }}
            >
              <div className="text-xs text-white/90 mb-1">
                Family<br />Members
              </div>
              <div className="text-sm sm:text-base font-semibold text-white mt-auto">
                Family
              </div>
              <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Health Trends Charts */}
      <div className="grid gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Blood Pressure Trend */}
        {bpChartData.length > 0 && (
          <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
            <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">Blood Pressure</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={bpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#0A0A0A" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#0A0A0A" />
                  <Tooltip />
                  <Line type="monotone" dataKey="systolic" stroke="#F7C9A3" strokeWidth={2} dot={{ fill: '#F7C9A3', r: 4 }} />
                  <Line type="monotone" dataKey="diastolic" stroke="#9BB4FF" strokeWidth={2} dot={{ fill: '#9BB4FF', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Weight Trend */}
        {weightChartData.length > 0 && (
          <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
            <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">Weight</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#0A0A0A" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#0A0A0A" />
                  <Tooltip />
                  <Area type="monotone" dataKey="weight" stroke="#0B5A46" fill="#EFF1ED" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Health Predictions */}
      {predictionInsights.length > 0 && (
        <div className="mb-6">
          <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#EDE6F7' }}>
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Health Trend Predictions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {predictionInsights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="p-3 bg-white rounded-xl">
                    <p className="font-semibold text-[#0A0A0A] text-sm mb-1">{insight.title}</p>
                    <p className="text-xs text-gray-700">{insight.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Health Insights Section */}
      {unreadInsights.filter(i => i.insight_type !== 'trend_analysis').length > 0 && (
        <div className="mb-6">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-gray-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Health Insights
                </CardTitle>
                <Link to={createPageUrl('Insights')}>
                  <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50 rounded-xl">
                    View All <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {unreadInsights.filter(i => i.insight_type !== 'trend_analysis').slice(0, 3).map((insight) => (
                  <div key={insight.id} className="p-3 bg-[#F4F4F2] rounded-xl">
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-[#0A0A0A] text-xs mb-1">{insight.title}</p>
                        <p className="text-xs text-gray-700">{insight.description}</p>
                      </div>
                      <Badge className={`text-xs rounded-lg ${
                        insight.severity === 'critical' || insight.severity === 'high' ? 'bg-red-100 text-red-700' :
                        insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {insight.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-3 sm:gap-4">
        {/* Latest Vitals */}
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">Latest Vitals</CardTitle>
              <Link to={createPageUrl('Vitals')}>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50 rounded-xl active-press h-8">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {vitals.length === 0 ? (
              <p className="text-center text-gray-600 py-6 sm:py-8 text-xs sm:text-sm">No vitals yet</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {latestBP && (
                  <div className="flex justify-between items-center p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
                    <div>
                      <p className="font-semibold text-[#0A0A0A] text-sm">BP</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(latestBP.measured_at), 'MMM d')}
                      </p>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-[#0A0A0A]">
                      {latestBP.systolic}/{latestBP.diastolic}
                    </p>
                  </div>
                )}
                {latestHR && (
                  <div className="flex justify-between items-center p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
                    <div>
                      <p className="font-semibold text-[#0A0A0A] text-sm">Heart Rate</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(latestHR.measured_at), 'MMM d')}
                      </p>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-[#0A0A0A]">
                      {latestHR.value} <span className="text-xs sm:text-sm text-gray-600">bpm</span>
                    </p>
                  </div>
                )}
                {latestWeight && (
                  <div className="flex justify-between items-center p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
                    <div>
                      <p className="font-semibold text-[#0A0A0A] text-sm">Weight</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(latestWeight.measured_at), 'MMM d')}
                      </p>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-[#0A0A0A]">
                      {latestWeight.value} <span className="text-xs sm:text-sm text-gray-600">{latestWeight.unit}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Medications */}
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">Active Meds</CardTitle>
              <Link to={createPageUrl('Medications')}>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50 rounded-xl active-press h-8">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {upcomingMeds.length === 0 ? (
              <p className="text-center text-gray-600 py-6 sm:py-8 text-xs sm:text-sm">No meds</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {upcomingMeds.map((med) => (
                  <div key={med.id} className="flex items-start justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0A0A0A] text-sm truncate">{med.medication_name}</p>
                      <p className="text-xs text-gray-600">{med.dosage}</p>
                      {med.times && med.times.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {med.times.join(', ')}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs rounded-xl flex-shrink-0 ml-2">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">Recent Docs</CardTitle>
              <Link to={createPageUrl('Documents')}>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50 rounded-xl active-press h-8">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {documents.length === 0 ? (
              <p className="text-center text-gray-600 py-6 sm:py-8 text-xs sm:text-sm">No docs</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-[#F4F4F2] rounded-2xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#0A0A0A] text-xs sm:text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(doc.created_date), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs rounded-xl flex-shrink-0">
                      {doc.document_type?.split('_')[0]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lab Alerts */}
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">Lab Alerts</CardTitle>
              <Link to={createPageUrl('LabResults')}>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50 rounded-xl active-press h-8">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {labResults.filter(r => r.flag !== 'normal').length === 0 ? (
              <div className="text-center py-4 sm:py-6">
                <CheckCircle className="w-8 sm:w-10 h-8 sm:h-10 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 text-xs sm:text-sm">All normal</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {labResults.filter(r => r.flag !== 'normal').slice(0, 3).map((result) => (
                  <div key={result.id} className="flex items-start justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${result.flag === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0A0A0A] text-xs sm:text-sm truncate">{result.test_name}</p>
                        <p className="text-xs text-gray-600">
                          {result.value} {result.unit}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs rounded-xl flex-shrink-0 ml-2 ${
                      result.flag === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {result.flag}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vital Entry Dialog */}
      <Dialog open={vitalDialogOpen} onOpenChange={setVitalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Vital Sign</DialogTitle>
          </DialogHeader>
          <VitalEntryForm
            profileId={selectedProfileId}
            onSuccess={() => {
              setVitalDialogOpen(false);
              queryClient.invalidateQueries(['vitals', selectedProfileId]);
            }}
            onCancel={() => setVitalDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Medical Document</DialogTitle>
          </DialogHeader>
          <UploadModal
            profileId={selectedProfileId}
            onSuccess={() => {
              setUploadDialogOpen(false);
              queryClient.invalidateQueries(['documents', selectedProfileId]);
            }}
            onCancel={() => setUploadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Health Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-3xl h-[700px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b border-gray-200" style={{ backgroundColor: '#E9F46A' }}>
            <DialogTitle className="flex items-center gap-2 text-[#0A0A0A]">
              <Brain className="w-5 h-5" />
              Smart Health Analytics
            </DialogTitle>
            <p className="text-xs text-gray-700 mt-1">
              Ask questions about your health data and get intelligent insights
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <AIHealthChat profileId={selectedProfileId} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}