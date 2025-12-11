import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Upload, FileText, Shield, Stethoscope, Pill, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OnboardingDocUpload() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const docTypes = [
    { value: 'insurance', label: 'Health Insurance', icon: Shield, color: 'text-blue-600' },
    { value: 'health_report', label: 'Health Report', icon: Stethoscope, color: 'text-green-600' },
    { value: 'lab_report', label: 'Lab Results', icon: FileText, color: 'text-purple-600' },
    { value: 'prescription', label: 'Prescription', icon: Pill, color: 'text-amber-600' },
    { value: 'discharge_summary', label: 'Hospital Discharge', icon: FileText, color: 'text-red-600' }
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedType) {
      alert('Please select document type and file');
      return;
    }

    try {
      setUploading(true);

      // Get user profile
      const user = await base44.auth.me();
      const profiles = await base44.entities.Profile.filter({ 
        relationship: 'self',
        created_by: user.email 
      });
      
      if (profiles.length === 0) {
        alert('Please create your profile first');
        navigate(createPageUrl('Onboarding'));
        return;
      }

      const profileId = profiles[0].id;

      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setUploading(false);
      setProcessing(true);

      // Process document
      const { data } = await base44.functions.invoke('processOnboardingDocument', {
        file_url,
        document_type: selectedType,
        profile_id: profileId
      });

      setResults(data.results);
      setProcessing(false);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to process document');
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleFinish = () => {
    navigate(createPageUrl('Dashboard'));
  };

  const handleSkip = () => {
    navigate(createPageUrl('Dashboard'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9F46A] via-[#F4F4F2] to-[#9BB4FF] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-0 shadow-2xl rounded-3xl">
        <CardContent className="p-6 sm:p-8">
          {!results ? (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#0A0A0A] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-2">
                  Upload Health Document
                </h1>
                <p className="text-sm text-gray-600">
                  Upload any health document to get started faster
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-[#0A0A0A] mb-3">
                    Document Type
                  </label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0A0A0A] mb-3">
                    Upload File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="cursor-pointer">
                      {file ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-6 w-6 text-green-600" />
                          <span className="text-sm font-medium text-green-600">{file.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1 h-12 rounded-2xl"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!file || !selectedType || uploading || processing}
                    className="flex-1 h-12 bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white rounded-2xl"
                  >
                    {uploading || processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploading ? 'Uploading...' : 'Processing...'}
                      </>
                    ) : (
                      'Upload & Process'
                    )}
                  </Button>
                </div>

                {processing && (
                  <div className="p-4 bg-blue-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <div className="text-sm">
                        <p className="font-semibold text-blue-900">Processing document...</p>
                        <p className="text-blue-700">Extracting health data with smart analysis</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#0A0A0A] mb-2">
                  Processing Complete!
                </h1>
                <p className="text-sm text-gray-600">
                  Your health data has been extracted and organized
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {results.documents_created?.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">Documents</span>
                    </div>
                    <Badge className="bg-blue-200 text-blue-900">{results.documents_created.length}</Badge>
                  </div>
                )}

                {results.insurance_created && (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-900">Insurance Policy Added</span>
                    </div>
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}

                {results.vitals_created?.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Stethoscope className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900">Vitals Recorded</span>
                    </div>
                    <Badge className="bg-purple-200 text-purple-900">{results.vitals_created.length}</Badge>
                  </div>
                )}

                {results.labs_created?.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-900">Lab Results</span>
                    </div>
                    <Badge className="bg-amber-200 text-amber-900">{results.labs_created.length}</Badge>
                  </div>
                )}

                {results.medications_created?.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-pink-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Pill className="h-5 w-5 text-pink-600" />
                      <span className="text-sm font-semibold text-pink-900">Medications</span>
                    </div>
                    <Badge className="bg-pink-200 text-pink-900">{results.medications_created.length}</Badge>
                  </div>
                )}

                {results.profiles_created?.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-900">Family Members</span>
                    </div>
                    <Badge className="bg-indigo-200 text-indigo-900">{results.profiles_created.length}</Badge>
                  </div>
                )}
              </div>

              <Button
                onClick={handleFinish}
                className="w-full h-12 bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl font-semibold"
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const Badge = ({ children, className }) => (
  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${className}`}>
    {children}
  </span>
);