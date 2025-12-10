import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function PrescriptionScanner({ profileId, onMedicationsExtracted }) {
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      return data.file_url;
    }
  });

  const extractMutation = useMutation({
    mutationFn: async (fileUrl) => {
      const response = await base44.functions.invoke('extractMedicationFromImage', {
        file_url: fileUrl,
        profile_id: profileId
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setExtractedData(data);
        toast.success(`Extracted ${data.extracted_count} medication(s)`);
      }
    },
    onError: () => {
      toast.error('Failed to extract medications');
    }
  });

  const addMedicationMutation = useMutation({
    mutationFn: (medData) => base44.entities.Medication.create({
      ...medData,
      profile_id: profileId,
      is_active: true,
      start_date: new Date().toISOString().split('T')[0]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['medications', profileId]);
      toast.success('Medication added');
    }
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setScanDialogOpen(true);

    try {
      const fileUrl = await uploadMutation.mutateAsync(file);
      await extractMutation.mutateAsync(fileUrl);
    } catch (error) {
      console.error('Processing error:', error);
    }
  };

  const handleAddMedication = (med) => {
    const medData = {
      medication_name: med.medication_name,
      dosage: med.dosage,
      frequency: med.frequency,
      purpose: med.instructions || '',
      prescriber: med.prescriber || '',
      times: med.suggested_times || [],
      side_effects: med.warnings || '',
      refills_remaining: med.refills_remaining || 0
    };

    addMedicationMutation.mutate(medData);
  };

  const handleAddAll = () => {
    if (!extractedData?.medications) return;

    extractedData.medications.forEach(med => {
      handleAddMedication(med);
    });

    setScanDialogOpen(false);
    setExtractedData(null);
    setSelectedFile(null);
  };

  return (
    <>
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-[#0A0A0A] text-sm mb-1">Smart Prescription Scanner</h3>
              <p className="text-xs text-gray-700 mb-3">
                Upload prescription image to auto-extract medication details and check for interactions
              </p>
              <label htmlFor="prescription-upload">
                <Button
                  type="button"
                  onClick={() => document.getElementById('prescription-upload').click()}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl active-press shadow-lg h-10 sm:h-11"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Scan Prescription
                </Button>
              </label>
              <input
                id="prescription-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Prescription Analysis</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {(uploadMutation.isPending || extractMutation.isPending) && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  {uploadMutation.isPending ? 'Uploading image...' : 'Extracting medication details...'}
                </p>
              </div>
            )}

            {extractedData && (
              <>
                {/* Confidence Score */}
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Extraction Confidence</span>
                    <span className={`text-lg font-bold ${
                      extractedData.confidence >= 80 ? 'text-green-600' : 
                      extractedData.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {extractedData.confidence}%
                    </span>
                  </div>
                  {extractedData.extraction_notes && (
                    <p className="text-xs text-gray-600 mt-2">{extractedData.extraction_notes}</p>
                  )}
                </div>

                {/* Interaction Warnings */}
                {extractedData.interaction_warnings?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-200">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      Drug Interaction Warnings
                    </h3>
                    <div className="space-y-2">
                      {extractedData.interaction_warnings.map((warning, i) => (
                        <div key={i} className="p-2 bg-white rounded-xl">
                          <p className="text-sm font-semibold">
                            {warning.new_medication} + {warning.existing_medication}
                          </p>
                          <Badge className={`text-xs rounded-xl mt-1 ${
                            warning.severity === 'major' ? 'bg-red-100 text-red-700' :
                            warning.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {warning.severity.toUpperCase()}
                          </Badge>
                          <p className="text-xs text-gray-700 mt-1">{warning.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Medications */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Extracted Medications ({extractedData.medications.length})</h3>
                  {extractedData.medications.map((med, i) => (
                    <div key={i} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-[#0A0A0A]">{med.medication_name}</h4>
                          <p className="text-xs text-gray-600 mt-1">Dosage: {med.dosage}</p>
                          <p className="text-xs text-gray-600">Frequency: {med.frequency}</p>
                          {med.suggested_times?.length > 0 && (
                            <p className="text-xs text-gray-600">Times: {med.suggested_times.join(', ')}</p>
                          )}
                          {med.prescriber && (
                            <p className="text-xs text-gray-600">Prescriber: {med.prescriber}</p>
                          )}
                          {med.refills_remaining !== null && (
                            <p className="text-xs text-gray-600">Refills: {med.refills_remaining}</p>
                          )}
                          {med.instructions && (
                            <p className="text-xs text-gray-700 mt-2 bg-white/50 p-2 rounded-xl">
                              📋 {med.instructions}
                            </p>
                          )}
                          {med.warnings && (
                            <p className="text-xs text-red-700 mt-2 bg-red-50 p-2 rounded-xl">
                              ⚠️ {med.warnings}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMedication(med)}
                          disabled={addMedicationMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-2xl active-press text-xs h-9"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddAll}
                    disabled={addMedicationMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-2xl active-press h-11"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Add All
                  </Button>
                  <Button
                    onClick={() => {
                      setScanDialogOpen(false);
                      setExtractedData(null);
                      setSelectedFile(null);
                    }}
                    variant="outline"
                    className="flex-1 rounded-2xl active-press h-11"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}