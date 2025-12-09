import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, FileText, Pill, TrendingUp, Users, 
  Plus, Calendar, AlertCircle, CheckCircle, ArrowRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import ProfileSwitcher from '../components/ProfileSwitcher';
import VitalEntryForm from '../components/VitalEntryForm';
import UploadModal from '../components/UploadModal';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [vitalDialogOpen, setVitalDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
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
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
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
    }, '-test_date', 5),
    enabled: !!selectedProfileId,
  });

  const getLatestVital = (type) => {
    return vitals.find(v => v.vital_type === type);
  };

  const latestBP = getLatestVital('blood_pressure');
  const latestWeight = getLatestVital('weight');
  const latestGlucose = getLatestVital('blood_glucose');
  const latestHR = getLatestVital('heart_rate');

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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Profile Switcher & Welcome Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A0A0A]">
            Welcome, {currentProfile?.full_name.split(' ')[0]}
          </h1>
          <ProfileSwitcher
            profiles={allProfiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        </div>
        <p className="text-sm text-gray-600">Your personal health dashboard</p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
        {/* Hero Card - Upload Document */}
        <div
          onClick={() => setUploadDialogOpen(true)}
          className="lg:col-span-12 rounded-2xl p-6 h-52 flex flex-col relative cursor-pointer transition-all hover:scale-[1.02]"
          style={{ backgroundColor: '#E9F46A' }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div className="text-xs sm:text-sm text-[#0A0A0A] mb-1">
            Medical Records<br />Upload & AI Processing
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#0A0A0A] mt-auto">
            Upload Document
          </div>
          <button className="absolute bottom-6 right-6 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center border border-gray-200 hover:bg-white transition-colors">
            <Plus className="w-4 h-4 text-[#0A0A0A]" />
          </button>
        </div>

        {/* Vitals Card */}
        <div
          onClick={() => setVitalDialogOpen(true)}
          className="lg:col-span-6 rounded-2xl p-6 h-48 flex flex-col relative cursor-pointer transition-all hover:scale-[1.02]"
          style={{ backgroundColor: '#9BB4FF' }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div className="text-xs sm:text-sm text-[#0A0A0A] mb-1">
            Track Daily<br />Blood Pressure, Weight & More
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#0A0A0A] mt-auto">
            Log Vitals
          </div>
          <button className="absolute bottom-6 right-6 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center border border-gray-200 hover:bg-white transition-colors">
            <Activity className="w-4 h-4 text-[#0A0A0A]" />
          </button>
        </div>

        {/* Medications Card */}
        <Link to={createPageUrl('Medications')} className="lg:col-span-6">
          <div
            className="rounded-2xl p-6 h-48 flex flex-col relative cursor-pointer transition-all hover:scale-[1.02]"
            style={{ backgroundColor: '#F7C9A3' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-xs sm:text-sm text-[#0A0A0A] mb-1">
              Medication Tracking<br />Schedule & Reminders
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-[#0A0A0A] mt-auto">
              Medications
            </div>
            <button className="absolute bottom-6 right-6 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center border border-gray-200 hover:bg-white transition-colors">
              <Pill className="w-4 h-4 text-[#0A0A0A]" />
            </button>
          </div>
        </Link>

        {/* Lab Results Card */}
        <Link to={createPageUrl('LabResults')} className="lg:col-span-4">
          <div
            className="rounded-2xl p-6 h-48 flex flex-col relative cursor-pointer transition-all hover:scale-[1.02]"
            style={{ backgroundColor: '#EDE6F7' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-xs sm:text-sm text-[#0A0A0A] mb-1">
              Test Results<br />Lab Reports
            </div>
            <div className="text-lg sm:text-xl font-semibold text-[#0A0A0A] mt-auto">
              Lab Results
            </div>
            <button className="absolute bottom-6 right-6 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center border border-gray-200">
              <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
            </button>
          </div>
        </Link>

        {/* Trends Card */}
        <Link to={createPageUrl('Trends')} className="lg:col-span-4">
          <div
            className="rounded-2xl p-6 h-48 flex flex-col relative cursor-pointer transition-all hover:scale-[1.02]"
            style={{ backgroundColor: '#EFF1ED' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-xs sm:text-sm text-[#0A0A0A] mb-1">
              Health Analytics<br />Visual Insights
            </div>
            <div className="text-lg sm:text-xl font-semibold text-[#0A0A0A] mt-auto">
              Health Trends
            </div>
            <button className="absolute bottom-6 right-6 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center border border-gray-200">
              <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
            </button>
          </div>
        </Link>

        {/* Profiles Card */}
        <Link to={createPageUrl('Profiles')} className="lg:col-span-4">
          <div
            className="rounded-2xl p-6 h-48 flex flex-col relative cursor-pointer transition-all hover:scale-[1.02]"
            style={{ backgroundColor: '#0B5A46' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-xs sm:text-sm text-white/90 mb-1">
              Family Members<br />Manage Profiles
            </div>
            <div className="text-lg sm:text-xl font-semibold text-white mt-auto">
              My Profiles
            </div>
            <button className="absolute bottom-6 right-6 w-9 h-9 bg-white/15 rounded-full flex items-center justify-center border border-white/20">
              <Users className="w-4 h-4 text-white" />
            </button>
          </div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latest Vitals */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Latest Vitals</CardTitle>
              <Link to={createPageUrl('Vitals')}>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {vitals.length === 0 ? (
              <p className="text-center text-gray-600 py-8 text-sm">No vitals recorded yet</p>
            ) : (
              <div className="space-y-3">
                {latestBP && (
                  <div className="flex justify-between items-center p-4 bg-[#F4F4F2] rounded-xl">
                    <div>
                      <p className="font-semibold text-[#0A0A0A]">Blood Pressure</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(latestBP.measured_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-[#0A0A0A]">
                      {latestBP.systolic}/{latestBP.diastolic}
                    </p>
                  </div>
                )}
                {latestHR && (
                  <div className="flex justify-between items-center p-4 bg-[#F4F4F2] rounded-xl">
                    <div>
                      <p className="font-semibold text-[#0A0A0A]">Heart Rate</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(latestHR.measured_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-[#0A0A0A]">
                      {latestHR.value} <span className="text-sm text-gray-600">bpm</span>
                    </p>
                  </div>
                )}
                {latestWeight && (
                  <div className="flex justify-between items-center p-4 bg-[#F4F4F2] rounded-xl">
                    <div>
                      <p className="font-semibold text-[#0A0A0A]">Weight</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(latestWeight.measured_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-[#0A0A0A]">
                      {latestWeight.value} <span className="text-sm text-gray-600">{latestWeight.unit}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Medications */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Active Medications</CardTitle>
              <Link to={createPageUrl('Medications')}>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {upcomingMeds.length === 0 ? (
              <p className="text-center text-gray-600 py-8 text-sm">No active medications</p>
            ) : (
              <div className="space-y-3">
                {upcomingMeds.map((med) => (
                  <div key={med.id} className="flex items-start justify-between p-4 bg-[#F4F4F2] rounded-xl">
                    <div className="flex-1">
                      <p className="font-semibold text-[#0A0A0A]">{med.medication_name}</p>
                      <p className="text-xs text-gray-600">{med.dosage} • {med.frequency.replace(/_/g, ' ')}</p>
                      {med.times && med.times.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {med.times.join(', ')}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Recent Documents</CardTitle>
              <Link to={createPageUrl('Documents')}>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-gray-50">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {documents.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No documents uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {documents.slice(0, 4).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(doc.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {doc.document_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abnormal Lab Results */}
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Lab Alerts</CardTitle>
              <Link to={createPageUrl('LabResults')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {labResults.filter(r => r.flag !== 'normal').length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">All lab results are normal</p>
              </div>
            ) : (
              <div className="space-y-3">
                {labResults.filter(r => r.flag !== 'normal').slice(0, 4).map((result) => (
                  <div key={result.id} className="flex items-start justify-between p-4 bg-[#F4F4F2] rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-5 h-5 mt-0.5 ${result.flag === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <div>
                        <p className="font-semibold text-[#0A0A0A] text-sm">{result.test_name}</p>
                        <p className="text-xs text-gray-600">
                          {result.value} {result.unit}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${
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
    </div>
  );
}