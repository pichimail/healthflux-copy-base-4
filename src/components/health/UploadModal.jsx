import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";

export default function UploadModal({ open, onClose, onUpload, isUploading }) {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentDate, setDocumentDate] = useState(null);
  const [facilityName, setFacilityName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');

  const documentTypes = [
    { value: 'lab_report', label: 'Lab Report' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'imaging', label: 'Imaging Report' },
    { value: 'discharge_summary', label: 'Discharge Summary' },
    { value: 'consultation', label: 'Consultation Note' },
    { value: 'vaccination', label: 'Vaccination Record' },
    { value: 'insurance', label: 'Insurance Document' },
    { value: 'other', label: 'Other' }
  ];

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    if (selectedFiles.length > 0 && !title) {
      setTitle(selectedFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      alert('Please select a file to upload.');
      return;
    }
    const formData = {
      title: title || files[0].name.replace(/\.[^/.]+$/, ''),
      document_type: documentType,
      document_date: documentDate ? format(documentDate, 'yyyy-MM-dd') : null,
      facility_name: facilityName,
      doctor_name: doctorName,
      notes,
    };
    onUpload(files, formData);
  };

  const handleClose = () => {
    setFiles([]);
    setTitle('');
    setDocumentType('');
    setDocumentDate(null);
    setFacilityName('');
    setDoctorName('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Medical Document</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">File(s)</Label>
            <Input 
              id="file" 
              type="file" 
              multiple 
              onChange={handleFileChange} 
              className="col-span-3" 
              accept="image/*,.pdf"
            />
          </div>
          {files.length > 0 && (
            <div className="col-span-4 text-sm text-gray-600 ml-auto">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="col-span-3"
              placeholder="Document title"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="documentType" className="text-right">Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="documentDate" className="text-right">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal col-span-3",
                    !documentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {documentDate ? format(documentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={documentDate}
                  onSelect={setDocumentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="facilityName" className="text-right">Facility</Label>
            <Input 
              id="facilityName" 
              value={facilityName} 
              onChange={(e) => setFacilityName(e.target.value)} 
              className="col-span-3"
              placeholder="Hospital or clinic name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="doctorName" className="text-right">Doctor</Label>
            <Input 
              id="doctorName" 
              value={doctorName} 
              onChange={(e) => setDoctorName(e.target.value)} 
              className="col-span-3"
              placeholder="Doctor's name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="col-span-3"
              placeholder="Additional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isUploading || files.length === 0}
            className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A]"
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}