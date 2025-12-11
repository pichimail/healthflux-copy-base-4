import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Share2, Phone, Pill, Activity, FileText, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EmergencyProfile() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState({
    recipient_name: '',
    recipient_email: '',
    expires_hours: 24,
  });

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
    if (profiles.length > 0) {
      setSelectedProfile(profiles[0]);
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile', selectedProfile?.id],
    queryFn: () => base44.entities.Profile.filter({ id: selectedProfile.id }),
    enabled: !!selectedProfile?.id,
    select: (data) => data[0],
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', selectedProfile?.id],
    queryFn: () => base44.entities.Medication.filter({ 
      profile_id: selectedProfile.id,
      is_active: true 
    }),
    enabled: !!selectedProfile?.id,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', selectedProfile?.id],
    queryFn: () => base44.entities.VitalMeasurement.filter({ 
      profile_id: selectedProfile.id 
    }, '-measured_at', 3),
    enabled: !!selectedProfile?.id,
  });

  const createShareLinkMutation = useMutation({
    mutationFn: async (data) => {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + data.expires_hours);
      
      return base44.entities.ShareLink.create({
        profile_id: selectedProfile.id,
        token,
        recipient_name: data.recipient_name,
        recipient_email: data.recipient_email,
        expires_at: expiresAt.toISOString(),
        allowed_scopes: ['documents', 'lab_results', 'vitals', 'medications'],
        purpose: 'Emergency Health Profile',
      });
    },
    onSuccess: (link) => {
      setShareLink(link);
      toast.success('Share link created');
    },
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(10, 10, 10);
    doc.text('EMERGENCY HEALTH PROFILE', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 20, y);
    y += 15;

    // Profile Info
    doc.setFontSize(14);
    doc.setTextColor(10, 10, 10);
    doc.text('PATIENT INFORMATION', 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.text(`Name: ${profile?.full_name || 'N/A'}`, 20, y);
    y += 6;
    doc.text(`Date of Birth: ${profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'MMM d, yyyy') : 'N/A'}`, 20, y);
    y += 6;
    doc.text(`Blood Group: ${profile?.blood_group || 'N/A'}`, 20, y);
    y += 6;
    doc.text(`Gender: ${profile?.gender || 'N/A'}`, 20, y);
    y += 10;

    // Emergency Contact
    if (profile?.emergency_contact) {
      doc.setFontSize(14);
      doc.text('EMERGENCY CONTACT', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(profile.emergency_contact, 20, y);
      y += 10;
    }

    // Allergies
    if (profile?.allergies?.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text('ALLERGIES (CRITICAL)', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(10, 10, 10);
      profile.allergies.forEach(allergy => {
        doc.text(`• ${allergy}`, 25, y);
        y += 6;
      });
      y += 4;
    }

    // Chronic Conditions
    if (profile?.chronic_conditions?.length > 0) {
      doc.setFontSize(14);
      doc.text('CHRONIC CONDITIONS', 20, y);
      y += 8;
      doc.setFontSize(10);
      profile.chronic_conditions.forEach(condition => {
        doc.text(`• ${condition}`, 25, y);
        y += 6;
      });
      y += 4;
    }

    // Current Medications
    if (medications.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text('CURRENT MEDICATIONS', 20, y);
      y += 8;
      doc.setFontSize(10);
      medications.forEach(med => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`• ${med.medication_name} - ${med.dosage}`, 25, y);
        y += 6;
        if (med.frequency) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`  ${med.frequency.replace(/_/g, ' ')}${med.purpose ? ` - ${med.purpose}` : ''}`, 27, y);
          y += 5;
          doc.setFontSize(10);
          doc.setTextColor(10, 10, 10);
        }
      });
      y += 4;
    }

    // Recent Vitals
    if (vitals.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text('RECENT VITAL SIGNS', 20, y);
      y += 8;
      doc.setFontSize(10);
      vitals.forEach(vital => {
        const value = vital.vital_type === 'blood_pressure' 
          ? `${vital.systolic}/${vital.diastolic}`
          : `${vital.value} ${vital.unit}`;
        doc.text(`• ${vital.vital_type.replace(/_/g, ' ')}: ${value}`, 25, y);
        y += 6;
      });
    }

    doc.save(`emergency-profile-${profile?.full_name?.replace(/\s/g, '-')}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleCreateShareLink = () => {
    createShareLinkMutation.mutate(shareData);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/public-share/${shareLink.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0A0A0A]">{t('emergency.title')}</h1>
            <p className="text-sm text-gray-600">{t('emergency.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={generatePDF}
          className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('emergency.download_pdf')}
        </Button>
        <Button
          onClick={() => setShareDialogOpen(true)}
          variant="outline"
          className="rounded-xl font-semibold"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {t('emergency.share_securely')}
        </Button>
      </div>

      {/* Alert Banner */}
      <Card className="border-2 border-red-200 bg-red-50 mb-6 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-sm mb-1">{t('emergency.important')}</p>
              <p className="text-xs text-red-800">
                {t('emergency.alert_text')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Information */}
      <Card className="border-0 shadow-sm rounded-2xl mb-4">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A]">{t('emergency.patient_info')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">{t('emergency.full_name')}</p>
              <p className="font-semibold text-[#0A0A0A]">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">{t('emergency.dob')}</p>
              <p className="font-semibold text-[#0A0A0A]">
                {profile.date_of_birth ? format(new Date(profile.date_of_birth), 'MMM d, yyyy') : t('emergency.not_provided')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">{t('emergency.blood_group')}</p>
              <Badge className="bg-red-100 text-red-700 border-red-200 text-sm">
                {profile.blood_group || t('emergency.not_provided')}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">{t('emergency.gender')}</p>
              <p className="font-semibold text-[#0A0A0A] capitalize">{profile.gender || t('emergency.not_provided')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="border-0 shadow-sm rounded-2xl mb-4 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            {t('emergency.emergency_contact')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {profile.emergency_contact ? (
            <p className="font-semibold text-[#0A0A0A] text-lg">{profile.emergency_contact}</p>
          ) : (
            <p className="text-gray-600 text-sm">{t('emergency.no_contact')}</p>
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="border-0 shadow-sm rounded-2xl mb-4 bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {t('emergency.allergies')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {profile.allergies?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((allergy, idx) => (
                <Badge key={idx} className="bg-red-100 text-red-700 border-red-200 text-sm px-3 py-1">
                  {allergy}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">{t('emergency.no_allergies')}</p>
          )}
        </CardContent>
      </Card>

      {/* Chronic Conditions */}
      <Card className="border-0 shadow-sm rounded-2xl mb-4">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            {t('emergency.chronic_conditions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {profile.chronic_conditions?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.chronic_conditions.map((condition, idx) => (
                <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                  {condition}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">{t('emergency.no_conditions')}</p>
          )}
        </CardContent>
      </Card>

      {/* Current Medications */}
      <Card className="border-0 shadow-sm rounded-2xl mb-4">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            {t('emergency.current_meds')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {medications.length > 0 ? (
            <div className="space-y-3">
              {medications.map((med) => (
                <div key={med.id} className="p-3 bg-[#F4F4F2] rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-[#0A0A0A]">{med.medication_name}</p>
                      <p className="text-sm text-gray-600">{med.dosage}</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        {med.frequency.replace(/_/g, ' ')}
                      </p>
                      {med.purpose && (
                        <p className="text-xs text-gray-600 mt-1">For: {med.purpose}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">{t('emergency.no_meds')}</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Vitals */}
      {vitals.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              {t('emergency.recent_vitals')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {vitals.map((vital) => (
                <div key={vital.id} className="flex justify-between items-center p-3 bg-[#F4F4F2] rounded-xl">
                  <div>
                    <p className="font-semibold text-[#0A0A0A] capitalize">
                      {vital.vital_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(vital.measured_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#0A0A0A]">
                    {vital.vital_type === 'blood_pressure' 
                      ? `${vital.systolic}/${vital.diastolic}`
                      : `${vital.value} ${vital.unit}`
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('emergency.share_profile')}</DialogTitle>
          </DialogHeader>
          {!shareLink ? (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_name">{t('emergency.recipient_name')}</Label>
                <Input
                  id="recipient_name"
                  value={shareData.recipient_name}
                  onChange={(e) => setShareData({ ...shareData, recipient_name: e.target.value })}
                  placeholder="Dr. Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient_email">{t('emergency.recipient_email')}</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  value={shareData.recipient_email}
                  onChange={(e) => setShareData({ ...shareData, recipient_email: e.target.value })}
                  placeholder="doctor@hospital.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_hours">{t('emergency.expires_in')}</Label>
                <Input
                  id="expires_hours"
                  type="number"
                  value={shareData.expires_hours}
                  onChange={(e) => setShareData({ ...shareData, expires_hours: parseInt(e.target.value) })}
                  min={1}
                  max={168}
                />
                <p className="text-xs text-gray-600">{t('emergency.hours')}</p>
              </div>
              <Button 
                onClick={handleCreateShareLink}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={createShareLinkMutation.isLoading}
              >
                {createShareLinkMutation.isLoading ? t('emergency.creating') : t('emergency.create_link')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-semibold text-green-900 mb-2">{t('emergency.link_created')}</p>
                <p className="text-xs text-green-700">
                  {t('emergency.expires')}: {format(new Date(shareLink.expires_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('emergency.share_link')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/public-share/${shareLink.token}`}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={copyShareLink}
                    variant="outline"
                    size="icon"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                {t('emergency.share_desc')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}