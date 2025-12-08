import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Eye, Trash2, Search, Filter, Plus, Download, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

export default function Documents() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Medical Documents</h1>
          <p className="text-slate-600">Upload and manage your medical records</p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedProfile || 'all'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-48">
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
          <SelectTrigger className="w-full sm:w-48">
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
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No documents found</p>
          <Button onClick={() => setUploadOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Upload Your First Document
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const profile = profiles.find(p => p.id === doc.profile_id);
            return (
              <Card key={doc.id} className="border-0 shadow-lg bg-white/80 backdrop-blur overflow-hidden hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline" className={getTypeColor(doc.document_type)}>
                      {doc.document_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{doc.title}</h3>
                  
                  {profile && (
                    <p className="text-sm text-slate-600 mb-2">
                      {profile.full_name}
                    </p>
                  )}

                  {doc.document_date && (
                    <p className="text-sm text-slate-500 mb-2">
                      {format(new Date(doc.document_date), 'MMM d, yyyy')}
                    </p>
                  )}

                  {doc.facility_name && (
                    <p className="text-sm text-slate-500 mb-4">{doc.facility_name}</p>
                  )}

                  {doc.ai_summary && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-900">{doc.ai_summary}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {!doc.ai_summary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateAISummary.mutate(doc)}
                        disabled={generateAISummary.isLoading}
                        className="flex-1"
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        AI Summary
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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