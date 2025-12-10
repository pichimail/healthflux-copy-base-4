import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DocumentViewer({ document, open, onClose }) {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{document.title}</span>
            {document.health_score && (
              <Badge className="bg-blue-100 text-blue-700 text-lg px-3 py-1">
                Health Score: {document.health_score}/100
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            {document.ai_summary && (
              <TabsTrigger value="ai">AI Analysis</TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-grow mt-4 overflow-y-auto">
            <TabsContent value="preview" className="mt-0 p-4">
              {document.file_type?.includes('pdf') ? (
                <iframe
                  src={document.file_url}
                  className="w-full h-[600px] rounded-lg border"
                  title="Document Preview"
                />
              ) : document.file_type?.includes('image') ? (
                <img
                  src={document.file_url}
                  alt={document.title}
                  className="w-full h-auto object-contain max-h-[600px] rounded-lg"
                />
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Preview not available for this file type.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.open(document.file_url, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-0 p-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F4F4F2] rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Document Type</p>
                    <p className="font-medium text-[#0A0A0A] capitalize">
                      {document.document_type?.replace(/_/g, ' ') || 'Not specified'}
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
                    <p className="text-[#0A0A0A]">{document.notes}</p>
                  </div>
                )}

                {document.risk_factors?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-700 font-semibold">Identified Risk Factors</p>
                    </div>
                    <ul className="space-y-2">
                      {document.risk_factors.map((risk, idx) => (
                        <li key={idx} className="text-sm text-red-800">
                          <span className="font-semibold">{risk.factor || risk}</span>
                          {risk.severity && (
                            <Badge className="ml-2 text-xs bg-red-100 text-red-700 border-red-300">
                              {risk.severity}
                            </Badge>
                          )}
                          {risk.description && (
                            <p className="text-xs text-red-700 mt-1">{risk.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {document.preventive_plan && (
                  <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-700 font-semibold">Preventive Care Plan</p>
                    </div>
                    <ReactMarkdown className="prose prose-sm max-w-none text-green-800">
                      {document.preventive_plan}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </TabsContent>

            {document.ai_summary && (
              <TabsContent value="ai" className="mt-0 p-4">
                <div className="space-y-4">
                  <div className="p-4 bg-violet-50 rounded-xl border-2 border-violet-200">
                    <h3 className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      AI-Generated Summary
                    </h3>
                    <ReactMarkdown className="prose prose-sm max-w-none text-violet-800">
                      {document.ai_summary}
                    </ReactMarkdown>
                  </div>

                  {document.health_score && (
                    <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2">Health Score Analysis</h3>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold text-blue-900">{document.health_score}</div>
                        <div className="flex-1">
                          <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600" 
                              style={{ width: `${document.health_score}%` }}
                            />
                          </div>
                          <p className="text-xs text-blue-700 mt-1">Based on document analysis</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}