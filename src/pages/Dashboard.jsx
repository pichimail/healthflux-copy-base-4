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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Switcher & Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {currentProfile?.full_name.split(' ')[0]}! 👋
          </h1>
          <ProfileSwitcher
            profiles={allProfiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        </div>
        <p className="text-slate-600">Here's your health overview for today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <Link key={idx} to={createPageUrl(stat.link)}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Button 
          onClick={() => setUploadDialogOpen(true)}
          className="w-full h-auto p-6 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5" />
            <span className="font-medium">Upload Document</span>
          </div>
        </Button>
        <Button 
          onClick={() => setVitalDialogOpen(true)}
          className="w-full h-auto p-6 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Log Vitals</span>
          </div>
        </Button>
        <Link to={createPageUrl('Medications')}>
          <Button className="w-full h-auto p-6 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg">
            <div className="flex items-center gap-3">
              <Pill className="w-5 h-5" />
              <span className="font-medium">Add Medication</span>
            </div>
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latest Vitals */}
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Latest Vitals</CardTitle>
              <Link to={createPageUrl('Vitals')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {vitals.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No vitals recorded yet</p>
            ) : (
              <div className="space-y-4">
                {latestBP && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Blood Pressure</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(latestBP.measured_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {latestBP.systolic}/{latestBP.diastolic}
                    </p>
                  </div>
                )}
                {latestHR && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Heart Rate</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(latestHR.measured_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {latestHR.value} <span className="text-sm text-slate-600">bpm</span>
                    </p>
                  </div>
                )}
                {latestWeight && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Weight</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(latestWeight.measured_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {latestWeight.value} <span className="text-sm text-slate-600">{latestWeight.unit}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Medications */}
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Active Medications</CardTitle>
              <Link to={createPageUrl('Medications')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {upcomingMeds.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No active medications</p>
            ) : (
              <div className="space-y-3">
                {upcomingMeds.map((med) => (
                  <div key={med.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{med.medication_name}</p>
                      <p className="text-sm text-slate-600">{med.dosage} • {med.frequency.replace(/_/g, ' ')}</p>
                      {med.times && med.times.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {med.times.join(', ')}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Recent Documents</CardTitle>
              <Link to={createPageUrl('Documents')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
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
                <p className="text-slate-600">All lab results are normal</p>
              </div>
            ) : (
              <div className="space-y-3">
                {labResults.filter(r => r.flag !== 'normal').slice(0, 4).map((result) => (
                  <div key={result.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-5 h-5 mt-0.5 ${result.flag === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <div>
                        <p className="font-medium text-slate-900">{result.test_name}</p>
                        <p className="text-sm text-slate-600">
                          {result.value} {result.unit}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${
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