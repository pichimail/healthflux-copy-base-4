import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Eye, Trash2, Search, Filter, Plus, Download, Sparkles, Brain, Pill, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import ExtractedDataReview from '../components/ExtractedDataReview';
import { toast } from 'sonner';

const calculateFlag = (value, refLow, refHigh) => {
  const val = parseFloat(value);
  const low = refLow ? parseFloat(refLow) : null;
  const high = refHigh ? parseFloat(refHigh) : null;

  if (isNaN(val)) return 'normal';
  if (low !== null && val < low) return 'low';
  if (high !== null && val > high) return 'high';
  return 'normal';
};

export default function Documents() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [reviewDoc, setReviewDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'lab_report',
    document_date: '',
    facility_name: '',
    notes: '',
    file: null,
  });

  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', selectedProfile],
    queryFn: () => selectedProfile 
      ? base44.entities.MedicalDocument.filter({ profile_id: selectedProfile }, '-created_date')
      : base44.entities.MedicalDocument.list('-created_date'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      return base44.entities.MedicalDocument.create({
        ...data,
        file_url,
        file_name: data.file.name,
        file_type: data.file.type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setUploadOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MedicalDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
    },
  });

  const generateAISummary = useMutation({
    mutationFn: async (doc) => {
      const summary = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this medical document and provide a brief summary (2-3 sentences) highlighting key findings, test results, or recommendations. Document: ${doc.title}, Type: ${doc.document_type}, Date: ${doc.document_date || 'Not specified'}, Facility: ${doc.facility_name || 'Unknown'}, Notes: ${doc.notes || 'None'}`,
        add_context_from_internet: false,
      });
      
      return base44.entities.MedicalDocument.update(doc.id, {
        ai_summary: summary,
        status: 'processed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      document_type: 'lab_report',
      document_date: '',
      facility_name: '',
      notes: '',
      file: null,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file, title: formData.title || file.name });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      alert('Please select a file');
      return;
    }

    const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
    if (!profileId) {
      alert('Please select a profile');
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({
        ...formData,
        profile_id: profileId,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(doc.id);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.facility_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type) => {
    const colors = {
      lab_report: 'bg-blue-100 text-blue-700 border-blue-200',
      prescription: 'bg-purple-100 text-purple-700 border-purple-200',
      imaging: 'bg-green-100 text-green-700 border-green-200',
      discharge_summary: 'bg-orange-100 text-orange-700 border-orange-200',
      consultation: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      vaccination: 'bg-pink-100 text-pink-700 border-pink-200',
      insurance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      other: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1">Medical Documents</h1>
          <p className="text-sm text-gray-600">Upload and manage your medical records</p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-xl font-semibold"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-gray-200"
          />
        </div>
        <Select value={selectedProfile || 'all'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl border-gray-200">
            <SelectValue placeholder="All Profiles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            {profiles.map(profile => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="lab_report">Lab Report</SelectItem>
            <SelectItem value="prescription">Prescription</SelectItem>
            <SelectItem value="imaging">Imaging</SelectItem>
            <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
            <SelectItem value="consultation">Consultation</SelectItem>
            <SelectItem value="vaccination">Vaccination</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4 text-sm">No documents found</p>
          <Button onClick={() => setUploadOpen(true)} className="rounded-xl bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A]">
            <Plus className="w-4 h-4 mr-2" />
            Upload Your First Document
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const profile = profiles.find(p => p.id === doc.profile_id);
            return (
              <Card key={doc.id} className="border-0 shadow-sm rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-[#9BB4FF] rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#0A0A0A]" />
                    </div>
                    <Badge variant="outline" className="text-xs capitalize rounded-lg">
                      {doc.document_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-[#0A0A0A] mb-2 line-clamp-2 text-sm">{doc.title}</h3>
                  
                  {profile && (
                    <p className="text-xs text-gray-600 mb-1">
                      {profile.full_name}
                    </p>
                  )}

                  {doc.document_date && (
                    <p className="text-xs text-gray-500 mb-1">
                      {format(new Date(doc.document_date), 'MMM d, yyyy')}
                    </p>
                  )}

                  {doc.facility_name && (
                    <p className="text-xs text-gray-500 mb-3">{doc.facility_name}</p>
                  )}

                  {doc.ai_summary && (
                    <div className="mb-3 p-3 bg-[#EDE6F7] rounded-xl">
                      <p className="text-xs text-[#0A0A0A]">{doc.ai_summary}</p>
                    </div>
                  )}

                  {doc.doctor_name && (
                    <p className="text-xs text-gray-600 mb-2">👨‍⚕️ {doc.doctor_name}</p>
                  )}

                  {(doc.extracted_medications?.length > 0 || doc.extracted_lab_results?.length > 0 || doc.extracted_vitals?.length > 0) && (
                    <div className="flex gap-2 mb-3">
                      {doc.extracted_medications?.length > 0 && (
                        <Badge className="bg-[#F7C9A3] text-[#0A0A0A] border-none text-xs rounded-lg">
                          <Pill className="w-3 h-3 mr-1" />
                          {doc.extracted_medications.length} meds
                        </Badge>
                      )}
                      {doc.extracted_lab_results?.length > 0 && (
                        <Badge className="bg-[#EFF1ED] text-[#0A0A0A] border-none text-xs rounded-lg">
                          <Activity className="w-3 h-3 mr-1" />
                          {doc.extracted_lab_results.length} labs
                        </Badge>
                      )}
                      {doc.extracted_vitals?.length > 0 && (
                        <Badge className="bg-[#9BB4FF] text-[#0A0A0A] border-none text-xs rounded-lg">
                          {doc.extracted_vitals.length} vitals
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="flex-1 rounded-xl text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    {(doc.extracted_medications?.length > 0 || doc.extracted_lab_results?.length > 0 || doc.extracted_vitals?.length > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewDoc(doc)}
                        className="flex-1 rounded-xl text-xs bg-[#E9F46A] hover:bg-[#D9E45A] border-none"
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                      className="text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Extracted Data Review Dialog */}
      <Dialog open={!!reviewDoc} onOpenChange={(open) => !open && setReviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Extracted Data - {reviewDoc?.title}</DialogTitle>
          </DialogHeader>
          {reviewDoc && (
            <ExtractedDataReview
              document={reviewDoc}
              onAddMedication={async (med) => {
                await base44.entities.Medication.create({
                  profile_id: reviewDoc.profile_id,
                  medication_name: med.name,
                  dosage: med.dosage,
                  frequency: med.frequency || 'as_needed',
                  times: med.times || [],
                  start_date: reviewDoc.document_date || new Date().toISOString().split('T')[0],
                  is_active: true,
                  purpose: med.purpose,
                  prescriber: reviewDoc.doctor_name
                });
                queryClient.invalidateQueries(['documents']);
              }}
              onAddVital={async (vital) => {
                await base44.entities.VitalMeasurement.create({
                  profile_id: reviewDoc.profile_id,
                  vital_type: vital.type,
                  systolic: vital.systolic,
                  diastolic: vital.diastolic,
                  value: vital.value,
                  unit: vital.unit,
                  measured_at: reviewDoc.document_date ? new Date(reviewDoc.document_date).toISOString() : new Date().toISOString(),
                  source: 'document'
                });
                queryClient.invalidateQueries(['documents']);
              }}
              onAddLabResult={async (lab) => {
                await base44.entities.LabResult.create({
                  profile_id: reviewDoc.profile_id,
                  document_id: reviewDoc.id,
                  test_name: lab.name,
                  test_category: lab.category || 'other',
                  value: parseFloat(lab.value),
                  unit: lab.unit,
                  reference_low: lab.reference_low ? parseFloat(lab.reference_low) : null,
                  reference_high: lab.reference_high ? parseFloat(lab.reference_high) : null,
                  flag: calculateFlag(lab.value, lab.reference_low, lab.reference_high),
                  test_date: reviewDoc.document_date || new Date().toISOString().split('T')[0],
                  facility: reviewDoc.facility_name
                });
                queryClient.invalidateQueries(['documents']);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Medical Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="file">Document File *</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
              />
              <p className="text-xs text-slate-500">Supported: PDF, JPG, PNG, DOC, DOCX</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Blood Test Report - Jan 2024"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type *</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab_report">Lab Report</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="imaging">Imaging</SelectItem>
                    <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_date">Document Date</Label>
                <Input
                  id="document_date"
                  type="date"
                  value={formData.document_date}
                  onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facility_name">Healthcare Facility</Label>
              <Input
                id="facility_name"
                value={formData.facility_name}
                onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
                placeholder="e.g., City Hospital"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or observations"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}