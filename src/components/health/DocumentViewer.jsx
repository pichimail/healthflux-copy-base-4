import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import DocumentChat from './DocumentChat';

export default function DocumentViewer({ document, open, onClose, profileId }) {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-5xl h-[90vh] sm:h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-base sm:text-lg font-bold text-[#0A0A0A] truncate pr-2">{document.title}</span>
            {document.health_score && (
              <Badge className="bg-blue-100 text-blue-700 text-sm sm:text-base px-2 sm:px-3 py-1 w-fit">
                Score: {document.health_score}/100
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 mx-4 sm:mx-6 mt-2 rounded-2xl">
            <TabsTrigger value="preview" className="text-xs sm:text-sm rounded-xl">Preview</TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm rounded-xl">Details</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs sm:text-sm rounded-xl">Chat</TabsTrigger>
            {document.ai_summary && (
              <TabsTrigger value="analysis" className="text-xs sm:text-sm rounded-xl">Analysis</TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-grow mt-2 sm:mt-4 overflow-y-auto">
            <TabsContent value="preview" className="mt-0 p-2 sm:p-4">
              {document.file_type?.includes('pdf') ? (
                <div className="w-full h-[500px] sm:h-[650px] bg-gray-100 rounded-2xl overflow-hidden">
                  <iframe
                    src={`${document.file_url}#view=FitH`}
                    type="application/pdf"
                    className="w-full h-full border-0"
                    title="Document Preview"
                  />
                </div>
              ) : document.file_type?.includes('image') ? (
                <div className="w-full bg-gray-100 rounded-2xl p-4 flex items-center justify-center">
                  <img
                    src={document.file_url}
                    alt={document.title}
                    className="max-w-full h-auto object-contain max-h-[500px] sm:max-h-[650px] rounded-xl"
                  />
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 text-gray-500">
                  <FileText className="h-12 sm:h-16 w-12 sm:w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">Preview not available</p>
                  <Button
                    variant="outline"
                    className="mt-4 rounded-2xl active-press"
                    onClick={() => window.open(document.file_url, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-0 p-3 sm:p-4">
              <div className="grid gap-3 sm:gap-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-[#F4F4F2] rounded-xl sm:rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Type</p>
                    <p className="font-semibold text-[#0A0A0A] text-sm capitalize">
                      {document.document_type?.replace(/_/g, ' ') || 'Other'}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-[#F4F4F2] rounded-xl sm:rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Date</p>
                    <p className="font-semibold text-[#0A0A0A] text-sm">
                      {document.document_date
                        ? format(new Date(document.document_date), 'MMM d, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {document.facility_name && (
                  <div className="p-3 sm:p-4 bg-[#F4F4F2] rounded-xl sm:rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Facility</p>
                    <p className="font-semibold text-[#0A0A0A] text-sm">{document.facility_name}</p>
                  </div>
                )}

                {document.doctor_name && (
                  <div className="p-3 sm:p-4 bg-[#F4F4F2] rounded-xl sm:rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Doctor</p>
                    <p className="font-semibold text-[#0A0A0A] text-sm">Dr. {document.doctor_name}</p>
                  </div>
                )}

                {document.notes && (
                  <div className="p-3 sm:p-4 bg-[#F4F4F2] rounded-xl sm:rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Notes</p>
                    <p className="text-[#0A0A0A] text-sm">{document.notes}</p>
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

            <TabsContent value="chat" className="mt-0 h-[500px] sm:h-[600px] flex flex-col">
              <DocumentChat document={document} profileId={profileId} />
            </TabsContent>

            {document.ai_summary && (
              <TabsContent value="analysis" className="mt-0 p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="p-3 sm:p-4 bg-violet-50 rounded-xl sm:rounded-2xl border-2 border-violet-200">
                    <h3 className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Summary
                    </h3>
                    <ReactMarkdown className="prose prose-sm max-w-none text-violet-800">
                      {document.ai_summary}
                    </ReactMarkdown>
                  </div>

                  {document.health_score && (
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-xl sm:rounded-2xl border-2 border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Health Score</h3>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-3xl sm:text-4xl font-bold text-blue-900">{document.health_score}</div>
                        <div className="flex-1">
                          <div className="h-2.5 sm:h-3 bg-blue-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 transition-all duration-500" 
                              style={{ width: `${document.health_score}%` }}
                            />
                          </div>
                          <p className="text-xs text-blue-700 mt-1">Flux Analysis</p>
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