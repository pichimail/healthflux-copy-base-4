import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentCard({ document, compact, onView, onDelete }) {
  const getDocumentIcon = () => {
    if (document.file_type?.includes('pdf')) return '📄';
    if (document.file_type?.includes('image')) return '🖼️';
    return '📋';
  };

  const getStatusColor = () => {
    switch (document.status) {
      case 'processed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (compact) {
    return (
      <Card className="border-0 shadow-sm rounded-xl hover:shadow-md transition-all cursor-pointer" onClick={() => onView(document)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-4xl">{getDocumentIcon()}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{document.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {document.document_type?.replace(/_/g, ' ')}
                </Badge>
                <Badge className={`text-xs ${getStatusColor()}`}>
                  {document.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {document.status}
                </Badge>
              </div>
              {document.document_date && (
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(document.document_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(document); }}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(document); }} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-all cursor-pointer group" onClick={() => onView(document)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="text-6xl mb-3">{getDocumentIcon()}</div>
          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{document.title}</h3>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            <Badge variant="outline" className="text-xs capitalize">
              {document.document_type?.replace(/_/g, ' ')}
            </Badge>
            <Badge className={`text-xs ${getStatusColor()}`}>
              {document.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {document.status}
            </Badge>
          </div>
          {document.document_date && (
            <p className="text-xs text-slate-500">
              {format(new Date(document.document_date), 'MMM d, yyyy')}
            </p>
          )}
          {document.facility_name && (
            <p className="text-xs text-slate-600 mt-1">{document.facility_name}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}