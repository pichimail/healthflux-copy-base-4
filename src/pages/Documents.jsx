import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, Search, Filter, Grid, List, FileText, 
  Calendar, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import ProfileSwitcher from '../components/ProfileSwitcher';
import DocumentCard from '../components/health/DocumentCard';
import UploadModal from '../components/health/UploadModal';
import DocumentViewer from '../components/health/DocumentViewer';
import DocumentSearchBar from '../components/health/DocumentSearchBar';

export default function Documents() {
  const [user, setUser] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
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
      setSelectedProfileId(profiles[0].id);
    }
  };

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
    enabled: !!user,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', selectedProfileId],
    queryFn: () => base44.entities.MedicalDocument.filter({ profile_id: selectedProfileId }, '-document_date'),
    enabled: !!selectedProfileId
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.MedicalDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents', selectedProfileId]);
    }
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ files, formData }) => {
      const results = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const doc = await base44.entities.MedicalDocument.create({
          profile_id: selectedProfileId,
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_url,
          file_type: file.type,
          file_name: file.name,
          ...formData,
          status: 'pending'
        });
        results.push(doc);
        processDocumentWithAI(doc);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents', selectedProfileId]);
      setShowUploadModal(false);
    }
  });

  const processDocumentWithAI = async (doc) => {
    try {
      await base44.entities.MedicalDocument.update(doc.id, { status: 'processing' });
      queryClient.invalidateQueries(['documents', selectedProfileId]);

      const { data: processed } = await base44.functions.invoke('enhancedDocumentProcessor', {
        file_url: doc.file_url,
        file_type: doc.file_type,
        profile_id: doc.profile_id
      });

      if (processed.success) {
        const { extractedData, aiAnalysis } = processed;

        await base44.entities.MedicalDocument.update(doc.id, {
          status: 'completed',
          title: extractedData.document_title || doc.title,
          document_type: extractedData.document_type || doc.document_type,
          document_date: extractedData.document_date || doc.document_date,
          facility_name: extractedData.facility_name || doc.facility_name,
          doctor_name: extractedData.doctor_name || doc.doctor_name,
          ai_summary: aiAnalysis.summary || extractedData.summary,
          health_score: aiAnalysis.health_score,
          risk_factors: aiAnalysis.risk_factors,
          preventive_plan: aiAnalysis.preventive_care_plan
        });

        if (extractedData.lab_results?.length > 0) {
          for (const lab of extractedData.lab_results) {
            if (lab.value && lab.test_name) {
              await base44.entities.LabResult.create({
                profile_id: doc.profile_id,
                document_id: doc.id,
                test_name: lab.test_name,
                test_category: lab.test_category || 'other',
                value: lab.value,
                unit: lab.unit,
                reference_low: lab.reference_min,
                reference_high: lab.reference_max,
                flag: lab.status || 'normal',
                test_date: extractedData.document_date || doc.document_date || new Date().toISOString().split('T')[0],
                notes: lab.notes
              });
            }
          }
        }

        if (extractedData.vitals?.length > 0) {
          for (const vital of extractedData.vitals) {
            if (vital.value && vital.type) {
              await base44.entities.VitalMeasurement.create({
                profile_id: doc.profile_id,
                vital_type: vital.type,
                value: vital.value,
                unit: vital.unit,
                systolic: vital.systolic,
                diastolic: vital.diastolic,
                measured_at: extractedData.document_date || doc.document_date || new Date().toISOString(),
                source: 'document'
              });
            }
          }
        }

        if (extractedData.medications?.length > 0) {
          for (const med of extractedData.medications) {
            if (med.name) {
              const frequency = mapFrequency(med.frequency);
              await base44.entities.Medication.create({
                profile_id: doc.profile_id,
                medication_name: med.name,
                dosage: med.dosage,
                frequency: frequency,
                purpose: med.instructions,
                start_date: extractedData.document_date || doc.document_date || new Date().toISOString().split('T')[0],
                is_active: true,
                reminders_enabled: true
              });
            }
          }
        }

        if (aiAnalysis.key_findings?.length > 0) {
          for (const finding of aiAnalysis.key_findings) {
            await base44.entities.HealthInsight.create({
              profile_id: doc.profile_id,
              insight_type: 'alert',
              severity: 'medium',
              title: 'Document Finding',
              description: finding,
              is_read: false,
              is_dismissed: false
            });
          }
        }

        queryClient.invalidateQueries(['documents', selectedProfileId]);
        queryClient.invalidateQueries(['labResults', selectedProfileId]);
        queryClient.invalidateQueries(['vitals', selectedProfileId]);
        queryClient.invalidateQueries(['medications', selectedProfileId]);
      }
    } catch (error) {
      console.error('Document processing error:', error);
      await base44.entities.MedicalDocument.update(doc.id, { status: 'failed' });
      queryClient.invalidateQueries(['documents', selectedProfileId]);
    }
  };

  const mapFrequency = (freq) => {
    const lower = freq?.toLowerCase() || '';
    if (lower.includes('once') || (lower.includes('1') && lower.includes('day'))) return 'once_daily';
    if (lower.includes('twice') || (lower.includes('2') && lower.includes('day'))) return 'twice_daily';
    if (lower.includes('three') || (lower.includes('3') && lower.includes('day'))) return 'three_times_daily';
    if (lower.includes('four') || (lower.includes('4') && lower.includes('day'))) return 'four_times_daily';
    return 'once_daily';
  };

  const reprocessDocument = async (documentToReprocess) => {
    await base44.entities.MedicalDocument.update(documentToReprocess.id, { status: 'processing' });
    queryClient.invalidateQueries(['documents', selectedProfileId]);
    processDocumentWithAI(documentToReprocess);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.facility_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const month = doc.document_date 
      ? format(new Date(doc.document_date), 'MMMM yyyy')
      : 'No Date';
    if (!acc[month]) acc[month] = [];
    acc[month].push(doc);
    return acc;
  }, {});

  const documentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'lab_report', label: 'Lab Reports' },
    { value: 'prescription', label: 'Prescriptions' },
    { value: 'discharge_summary', label: 'Discharge Summary' },
    { value: 'imaging', label: 'Imaging' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'other', label: 'Other' }
  ];

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1 flex items-center gap-3">
            <span className="text-3xl">📄</span>
            Documents
          </h1>
          <p className="text-sm text-gray-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''} • AI-powered search & categorization
          </p>
        </div>
        <div className="flex gap-3">
          <ProfileSwitcher
            profiles={profiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-xl font-semibold"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      <DocumentSearchBar 
        profileId={selectedProfileId}
        onResultClick={(doc) => setSelectedDocument(doc)}
      />

      <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
        <div className="flex flex-col gap-3 w-full">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filter by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1 h-11 rounded-xl">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1 h-11 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Processed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-32 h-11 rounded-xl">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icon">Icon View</SelectItem>
                <SelectItem value="list">List View</SelectItem>
                <SelectItem value="kanban">Kanban View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(filterType !== 'all' || filterStatus !== 'all' || searchQuery) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                Search: {searchQuery}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {filterType !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                {documentTypes.find(t => t.value === filterType)?.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterType('all')} />
              </Badge>
            )}
            {filterStatus !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                {filterStatus}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="text-center py-16">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">No documents found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first medical document to get started'}
          </p>
          <Button onClick={() => setShowUploadModal(true)} className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A]">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {['pending', 'processing', 'completed', 'failed'].map(status => {
            const statusDocs = filteredDocuments.filter(d => d.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-80">
                <div className="bg-gray-100 rounded-2xl p-4">
                  <h3 className="font-bold text-[#0A0A0A] mb-3 flex items-center justify-between">
                    <span className="capitalize">{status}</span>
                    <Badge>{statusDocs.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {statusDocs.map(doc => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        compact={true}
                        onView={setSelectedDocument}
                        onDelete={(doc) => {
                          if (confirm('Are you sure you want to delete this document?')) {
                            deleteDocumentMutation.mutate(doc.id);
                          }
                        }}
                        onReprocess={reprocessDocument}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedDocuments).map(([month, docs]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {month}
              </h2>
              <div className={cn(
                viewMode === 'icon' 
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "space-y-3"
              )}>
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    compact={viewMode === 'list'}
                    onView={setSelectedDocument}
                    onDelete={(doc) => {
                      if (confirm('Are you sure you want to delete this document?')) {
                        deleteDocumentMutation.mutate(doc.id);
                      }
                    }}
                    onReprocess={reprocessDocument}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={(files, formData) => uploadDocumentMutation.mutate({ files, formData })}
        isUploading={uploadDocumentMutation.isPending}
      />

      <DocumentViewer
        document={selectedDocument}
        open={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        profileId={selectedProfileId}
      />
    </div>
  );
}