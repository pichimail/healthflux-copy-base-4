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
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Mobile-First Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">📄</span>
            <span className="hidden sm:inline">Documents</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {documents.length} doc{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="hidden sm:block">
            <ProfileSwitcher
              profiles={profiles}
              selectedProfile={selectedProfileId}
              onProfileChange={setSelectedProfileId}
            />
          </div>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl font-semibold shadow-lg active-press h-12 px-4 sm:px-6"
          >
            <Upload className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </div>
      </div>

      {/* Mobile Profile Selector */}
      <div className="sm:hidden mb-4">
        <ProfileSwitcher
          profiles={profiles}
          selectedProfile={selectedProfileId}
          onProfileChange={setSelectedProfileId}
        />
      </div>

      <DocumentSearchBar 
        profileId={selectedProfileId}
        onResultClick={(doc) => setSelectedDocument(doc)}
      />

      {/* Mobile-First Filters */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-gray-200 mb-4 sm:mb-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:gap-3 w-full">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 sm:h-12 rounded-xl border-gray-200"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder="Type" />
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
              <SelectTrigger className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Done</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icon">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="kanban">Board</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(filterType !== 'all' || filterStatus !== 'all' || searchQuery) && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs active-press">
                {searchQuery.substring(0, 15)}{searchQuery.length > 15 ? '...' : ''}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {filterType !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs active-press">
                {documentTypes.find(t => t.value === filterType)?.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterType('all')} />
              </Badge>
            )}
            {filterStatus !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs active-press capitalize">
                {filterStatus}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 sm:h-56 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="text-center py-12 sm:py-16 rounded-3xl card-shadow">
          <FileText className="h-12 sm:h-16 w-12 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-[#0A0A0A] mb-2">No documents found</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first medical document'}
          </p>
          <Button 
            onClick={() => setShowUploadModal(true)} 
            className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl active-press h-12 px-6 shadow-lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 smooth-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
          {['pending', 'processing', 'completed', 'failed'].map(status => {
            const statusDocs = filteredDocuments.filter(d => d.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-72 sm:w-80">
                <div className="bg-[#F4F4F2] rounded-2xl sm:rounded-3xl p-3 sm:p-4">
                  <h3 className="font-bold text-[#0A0A0A] text-sm sm:text-base mb-3 flex items-center justify-between">
                    <span className="capitalize">{status}</span>
                    <Badge className="text-xs">{statusDocs.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {statusDocs.map(doc => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        compact={true}
                        onView={setSelectedDocument}
                        onDelete={(doc) => {
                          if (confirm('Delete this document?')) {
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
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(groupedDocuments).map(([month, docs]) => (
            <div key={month}>
              <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2 px-1">
                <Calendar className="h-3 sm:h-4 w-3 sm:w-4" />
                {month}
              </h2>
              <div className={cn(
                viewMode === 'icon' 
                  ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
                  : "space-y-2 sm:space-y-3"
              )}>
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    compact={viewMode === 'list'}
                    onView={setSelectedDocument}
                    onDelete={(doc) => {
                      if (confirm('Delete this document?')) {
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