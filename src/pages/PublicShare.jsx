import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, FileText, Heart, Pill, Shield, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PublicShare() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState({
    documents: [],
    labResults: [],
    vitals: [],
    medications: [],
  });

  useEffect(() => {
    loadShareData();
  }, []);

  const loadShareData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      // Find share link by token
      const links = await base44.entities.ShareLink.filter({ token });
      
      if (links.length === 0) {
        setError('Share link not found');
        setLoading(false);
        return;
      }

      const link = links[0];

      // Check if link is active and not expired
      if (!link.is_active) {
        setError('This share link has been deactivated');
        setLoading(false);
        return;
      }

      if (new Date(link.expires_at) < new Date()) {
        setError('This share link has expired');
        setLoading(false);
        return;
      }

      setShareLink(link);

      // Load profile
      const profileData = await base44.entities.Profile.filter({ id: link.profile_id });
      if (profileData.length > 0) {
        setProfile(profileData[0]);
      }

      // Load data based on allowed scopes
      const loadedData = {};

      if (link.allowed_scopes.includes('documents')) {
        loadedData.documents = await base44.entities.MedicalDocument.filter({ 
          profile_id: link.profile_id 
        }, '-created_date', 10);
      }

      if (link.allowed_scopes.includes('lab_results')) {
        loadedData.labResults = await base44.entities.LabResult.filter({ 
          profile_id: link.profile_id 
        }, '-test_date', 20);
      }

      if (link.allowed_scopes.includes('vitals')) {
        loadedData.vitals = await base44.entities.VitalMeasurement.filter({ 
          profile_id: link.profile_id 
        }, '-measured_at', 30);
      }

      if (link.allowed_scopes.includes('medications')) {
        loadedData.medications = await base44.entities.Medication.filter({ 
          profile_id: link.profile_id,
          is_active: true 
        });
      }

      setData(loadedData);

      // Update access count
      await base44.entities.ShareLink.update(link.id, {
        access_count: (link.access_count || 0) + 1,
      });

      setLoading(false);
    } catch (err) {
      console.error('Error loading share data:', err);
      setError('Failed to load shared health data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const prepareVitalsChart = (vitalType) => {
    const filtered = data.vitals?.filter(v => v.vital_type === vitalType) || [];
    
    if (vitalType === 'blood_pressure') {
      return filtered.map(v => ({
        date: format(new Date(v.measured_at), 'MMM d'),
        systolic: v.systolic,
        diastolic: v.diastolic,
      })).reverse();
    }
    
    return filtered.map(v => ({
      date: format(new Date(v.measured_at), 'MMM d'),
      value: v.value,
    })).reverse();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Shared Health Record</h1>
              <p className="text-sm text-slate-600">Read-only access</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Info */}
        {profile && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-8">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{profile.full_name}</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {profile.date_of_birth && (
                  <div>
                    <p className="text-slate-600">Date of Birth</p>
                    <p className="font-medium text-slate-900">{format(new Date(profile.date_of_birth), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {profile.gender && (
                  <div>
                    <p className="text-slate-600">Gender</p>
                    <p className="font-medium text-slate-900 capitalize">{profile.gender}</p>
                  </div>
                )}
                {profile.blood_group && (
                  <div>
                    <p className="text-slate-600">Blood Group</p>
                    <p className="font-medium text-slate-900">{profile.blood_group}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Info */}
        <Card className="border-0 shadow-lg bg-blue-50 border-blue-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-1">
                  {shareLink?.purpose || 'Shared Health Data'}
                </p>
                <p className="text-sm text-blue-700">
                  This link expires on {format(new Date(shareLink?.expires_at), 'MMM d, yyyy h:mm a')}
                </p>
                {shareLink?.recipient_name && (
                  <p className="text-sm text-blue-700 mt-1">
                    Shared with: {shareLink.recipient_name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        {data.documents && data.documents.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-8">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Medical Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {data.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{doc.title}</p>
                      <p className="text-sm text-slate-600">
                        {doc.document_date && format(new Date(doc.document_date), 'MMM d, yyyy')}
                        {doc.facility_name && ` • ${doc.facility_name}`}
                      </p>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lab Results */}
        {data.labResults && data.labResults.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-8">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Lab Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {data.labResults.map((result) => (
                  <div key={result.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-slate-900">{result.test_name}</p>
                      <Badge variant="outline" className={
                        result.flag === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                        result.flag === 'low' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        'bg-green-100 text-green-700 border-green-200'
                      }>
                        {result.flag}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {result.value} <span className="text-sm text-slate-600">{result.unit}</span>
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {format(new Date(result.test_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vitals Chart */}
        {data.vitals && data.vitals.length > 0 && shareLink?.allowed_scopes.includes('trends') && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-8">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Blood Pressure Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareVitalsChart('blood_pressure')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Medications */}
        {data.medications && data.medications.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-8">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {data.medications.map((med) => (
                  <div key={med.id} className="p-4 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">{med.medication_name}</p>
                    <p className="text-sm text-slate-600">
                      {med.dosage} • {med.frequency.replace(/_/g, ' ')}
                    </p>
                    {med.purpose && (
                      <p className="text-sm text-slate-600 mt-1">Purpose: {med.purpose}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <Card className="border-0 shadow-lg bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-sm text-yellow-900">
              ⚠️ <strong>Disclaimer:</strong> This is read-only shared health data. 
              For complete medical records and treatment decisions, please consult directly with healthcare providers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}