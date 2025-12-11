import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, FileText, Activity, TestTube, Pill, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function SharedRecord() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareData, setShareData] = useState(null);

  useEffect(() => {
    loadSharedData();
  }, []);

  const loadSharedData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pathParts = window.location.pathname.split('/');
      const token = pathParts[pathParts.length - 1];

      if (!token) {
        setError('Invalid link');
        setLoading(false);
        return;
      }

      const { data } = await base44.functions.invoke('accessShareLink', { token });
      setShareData(data);
    } catch (err) {
      setError(err.message || 'Failed to load shared data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading shared records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-3xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[#0A0A0A] mb-2">Access Denied</h1>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-xs text-amber-800">
                This link may have expired, been deactivated, or reached its view limit.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border-0 shadow-lg rounded-3xl bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-[#0A0A0A] mb-1">Shared Health Records</h1>
                <p className="text-sm text-gray-600 mb-3">
                  Securely shared via HealthFlux
                </p>
                {shareData?.expires_at && (
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <Clock className="h-3 w-3" />
                    <span>Expires {format(new Date(shareData.expires_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        {shareData?.data?.documents && shareData.data.documents.length > 0 && (
          <Card className="mb-4 rounded-3xl">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Medical Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {shareData.data.documents.map(doc => (
                  <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0A0A0A]">{doc.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(doc.document_date || doc.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className="capitalize">
                        {doc.document_type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    
                    {doc.ai_summary && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-900">{doc.ai_summary}</p>
                      </div>
                    )}

                    {shareData.access_level === 'download' && (
                      <Button
                        onClick={() => window.open(doc.file_url, '_blank')}
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-xl"
                      >
                        View Document
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Summary */}
        {shareData?.data?.profile && (
          <div className="space-y-4">
            <Card className="rounded-3xl">
              <CardHeader className="border-b">
                <CardTitle>Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F4F4F2] rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Name</p>
                    <p className="font-semibold">{shareData.data.profile.full_name}</p>
                  </div>
                  <div className="p-3 bg-[#F4F4F2] rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Blood Group</p>
                    <p className="font-semibold">{shareData.data.profile.blood_group || 'N/A'}</p>
                  </div>
                </div>
                
                {shareData.data.profile.allergies?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-200">
                    <p className="text-sm font-semibold text-red-900 mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {shareData.data.profile.allergies.map((allergy, idx) => (
                        <Badge key={idx} className="bg-red-100 text-red-800">{allergy}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {shareData.data.profile.chronic_conditions?.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200">
                    <p className="text-sm font-semibold text-amber-900 mb-2">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {shareData.data.profile.chronic_conditions.map((condition, idx) => (
                        <Badge key={idx} className="bg-amber-100 text-amber-800">{condition}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {shareData.data.recent_vitals?.length > 0 && (
              <Card className="rounded-3xl">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Vitals
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {shareData.data.recent_vitals.slice(0, 5).map(vital => (
                      <div key={vital.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-sm capitalize">{vital.vital_type?.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{format(new Date(vital.measured_at), 'MMM d, h:mm a')}</p>
                        </div>
                        <p className="font-bold">
                          {vital.vital_type === 'blood_pressure' 
                            ? `${vital.systolic}/${vital.diastolic}` 
                            : `${vital.value} ${vital.unit}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {shareData.data.active_medications?.length > 0 && (
              <Card className="rounded-3xl">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Active Medications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {shareData.data.active_medications.map(med => (
                      <div key={med.id} className="p-3 bg-slate-50 rounded-xl">
                        <p className="font-semibold text-sm">{med.medication_name}</p>
                        <p className="text-xs text-gray-600">{med.dosage} - {med.frequency?.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 p-4 bg-white rounded-2xl text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold text-[#0A0A0A]">HealthFlux</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Secure health data sharing</p>
        </div>
      </div>
    </div>
  );
}