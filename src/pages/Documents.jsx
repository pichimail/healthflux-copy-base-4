import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, Search, Filter, Grid, List, FileText, 
  SlidersHorizontal, Calendar, Building2, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import ProfileSwitcher from '../components/ProfileSwitcher';
import DocumentCard from '../components/health/DocumentCard';
import UploadModal from '../components/UploadModal';
import DocumentViewer from '../components/health/DocumentViewer';
import DocumentSearchBar from '../components/health/DocumentSearchBar';

export default function Documents() {
  const [currentProfile, setCurrentProfile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date')
  });

  useEffect(() => {
    if (profiles.length > 0 && !currentProfile) {
      const primary = profiles.find(p => p.relationship === 'self') || profiles[0];
      setCurrentProfile(primary);
    }
  }, [profiles, currentProfile]);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', currentProfile?.id],
    queryFn: () => base44.entities.MedicalDocument.filter({ profile_id: currentProfile?.id }, '-created_date'),
    enabled: !!currentProfile?.id
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.MedicalDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents', currentProfile?.id]);
    }
  });

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
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 py-3 sm:py-6 sticky top-0 z-40 lg:relative">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <ProfileSwitcher
              profiles={profiles}
              selectedProfile={currentProfile?.id}
              onProfileChange={(id) => setCurrentProfile(profiles.find(p => p.id === id))}
            />
            
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] font-semibold rounded-xl"
              size="lg"
            >
              <Upload className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 lg:pb-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
            <span className="text-4xl sm:text-5xl">📄</span>
            Documents
          </h1>
          <p className="text-sm sm:text-lg text-slate-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''} • AI-powered organization
          </p>
        </div>

        <DocumentSearchBar 
          profileId={currentProfile?.id}
          onResultClick={(doc) => setSelectedDocument(doc)}
        />

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-slate-900 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4 w-full">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Filter by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            
            <div className="flex gap-2 sm:gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1 sm:w-48 h-11 rounded-xl">
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
                <SelectTrigger className="flex-1 sm:w-40 h-11 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
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
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 sm:h-64 bg-white rounded-xl sm:rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="text-center py-12 sm:py-16 border-0 shadow-sm rounded-2xl">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No documents found</h3>
            <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6 px-4">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first medical document to get started'}
            </p>
            <Button onClick={() => setShowUploadModal(true)} className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-xl">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </Card>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {['uploaded', 'processing', 'processed', 'failed'].map(status => {
              const statusDocs = filteredDocuments.filter(d => d.status === status);
              return (
                <div key={status} className="flex-shrink-0 w-80">
                  <div className="bg-slate-100 rounded-2xl p-4">
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
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
                            if (confirm('Delete this document?')) {
                              deleteDocumentMutation.mutate(doc.id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 w-full">
            {Object.entries(groupedDocuments).map(([month, docs]) => (
              <div key={month}>
                <h2 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  {month}
                </h2>
                <div className={cn(
                  viewMode === 'icon' 
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
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
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <UploadModal
        profileId={currentProfile?.id}
        onSuccess={() => {
          setShowUploadModal(false);
          queryClient.invalidateQueries(['documents']);
        }}
        onCancel={() => setShowUploadModal(false)}
      />

      <DocumentViewer
        document={selectedDocument}
        open={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}