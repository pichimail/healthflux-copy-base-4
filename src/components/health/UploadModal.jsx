import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2 } from 'lucide-react';

export default function UploadModal({ open, onClose, onUpload, isUploading }) {
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      alert('Please select a file to upload.');
      return;
    }
    onUpload(files, {});
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload Medical Document</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            AI will automatically extract all information from your document
          </p>
        </DialogHeader>
        <div className="py-8">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#E9F46A] transition-colors">
            <Input 
              id="file" 
              type="file" 
              multiple 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*,.pdf"
            />
            <label htmlFor="file" className="cursor-pointer">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-[#0A0A0A] mb-1">
                {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Click to upload'}
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, JPG, PNG • Max 10MB per file
              </p>
              {files.length > 0 && (
                <div className="mt-3 space-y-1">
                  {files.map((file, idx) => (
                    <p key={idx} className="text-xs text-gray-600 truncate">{file.name}</p>
                  ))}
                </div>
              )}
            </label>
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
            {isUploading ? 'Processing...' : 'Upload & Process'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}