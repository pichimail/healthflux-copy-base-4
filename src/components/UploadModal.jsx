import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react';

export default function UploadModal({ profileId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'lab_report',
    document_date: new Date().toISOString().slice(0, 10),
    facility_name: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.title) {
        setFormData({ ...formData, title: selectedFile.name.split('.')[0] });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      const document = await base44.entities.MedicalDocument.create({
        profile_id: profileId,
        title: formData.title,
        document_type: formData.document_type,
        file_url,
        file_name: file.name,
        file_type: file.type,
        document_date: formData.document_date,
        facility_name: formData.facility_name,
        notes: formData.notes,
        status: 'processing',
      });

      setUploading(false);
      setProcessing(true);

      // Process with enhanced AI
      try {
        await base44.functions.invoke('enhancedAIProcessing', {
          document_id: document.id,
          file_url,
          profile_id: profileId,
        });
      } catch (error) {
        console.log('AI processing not available or failed:', error);
      }

      setProcessing(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Upload File *</Label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            id="file-upload"
            required
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {file ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <FileText className="w-8 h-8" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">Click to upload document</p>
                <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Document Title *</Label>
        <Input
          placeholder="e.g., Blood Test Report"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Document Type *</Label>
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
          <Label>Document Date</Label>
          <Input
            type="date"
            value={formData.document_date}
            onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Facility/Provider</Label>
        <Input
          placeholder="e.g., City Hospital"
          value={formData.facility_name}
          onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Textarea
          placeholder="Any additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="bg-[#E9F46A] rounded-xl p-3 mb-4">
        <p className="text-xs text-[#0A0A0A] flex items-start gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            AI will automatically analyze your document and extract medications, lab results, vitals, and generate insights.
          </span>
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl" disabled={uploading || processing}>
          Cancel
        </Button>
        <Button type="submit" disabled={uploading || processing} className="flex-1 bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-xl font-semibold">
          {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {processing ? 'AI Processing...' : uploading ? 'Uploading...' : 'Upload & Process'}
        </Button>
      </div>
    </form>
  );
}