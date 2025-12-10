import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentViewer({ document, open, onClose }) {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{document.title}</span>
            <Button variant="outline" size="sm" onClick={() => window.open(document.file_url, '_blank')}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preview" className="mt-4">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            {document.ai_summary && <TabsTrigger value="ai">AI Summary</TabsTrigger>}
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            {document.file_type?.includes('pdf') ? (
              <iframe
                src={document.file_url}
                className="w-full h-[600px] rounded-lg border"
                title={document.title}
              />
            ) : document.file_type?.includes('image') ? (
              <img
                src={document.file_url}
                alt={document.title}
                className="w-full rounded-lg"
              />
            ) : (
              <div className="text-center py-16 text-slate-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p>Preview not available for this file type</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.open(document.file_url, '_blank')}
                >
                  Download File
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#F4F4F2] rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Document Type</p>
                  <p className="font-medium text-[#0A0A0A] capitalize">
                    {document.document_type?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="p-4 bg-[#F4F4F2] rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Date</p>
                  <p className="font-medium text-[#0A0A0A]">
                    {document.document_date 
                      ? format(new Date(document.document_date), 'MMM d, yyyy')
                      : 'Not specified'}
                  </p>
                </div>
              </div>
              
              {document.facility_name && (
                <div className="p-4 bg-[#F4F4F2] rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Facility</p>
                  <p className="font-medium text-[#0A0A0A]">{document.facility_name}</p>
                </div>
              )}
              
              {document.doctor_name && (
                <div className="p-4 bg-[#F4F4F2] rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Doctor</p>
                  <p className="font-medium text-[#0A0A0A]">Dr. {document.doctor_name}</p>
                </div>
              )}

              {document.notes && (
                <div className="p-4 bg-[#F4F4F2] rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{document.notes}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {document.ai_summary && (
            <TabsContent value="ai" className="mt-4">
              <div className="p-6 bg-violet-50 rounded-xl">
                <h3 className="font-semibold text-violet-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  AI-Generated Summary
                </h3>
                <p className="text-violet-800 leading-relaxed whitespace-pre-line">
                  {document.ai_summary}
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}