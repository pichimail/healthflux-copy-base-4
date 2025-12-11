import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Image, MoreVertical, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";

export default function DocumentCard({ document, compact = false, onView, onDelete, onReprocess, className, style }) {
  const getFileIcon = (fileType) => {
    if (fileType?.includes('image')) return <Image className="h-6 w-6 text-blue-500" />;
    if (fileType?.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    return <FileText className="h-6 w-6 text-gray-500" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-none">
            Processing <Loader2 className="h-3 w-3 ml-1 animate-spin" />
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 border-none">
            Processed <CheckCircle className="h-3 w-3 ml-1" />
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 border-none">
            Failed <AlertCircle className="h-3 w-3 ml-1" />
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="border-none">{status}</Badge>;
    }
  };

  return (
    <Card className={cn("card-interactive card-shadow hover:shadow-lg border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden", className)} style={style}>
      <CardContent className="p-0">
        <div className="flex">
          <div 
            className="flex-grow cursor-pointer" 
            onClick={() => onView(document)}
          >
            <div className={cn(
              "flex items-center gap-2 sm:gap-3 p-3 sm:p-4",
              compact ? "flex-row" : "flex-col items-start"
            )}>
              <div className={compact ? "flex items-center gap-2 sm:gap-3 flex-1 min-w-0" : "mb-2 sm:mb-3 w-full"}>
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  {getFileIcon(document.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold text-[#0A0A0A] truncate", compact ? "text-sm" : "text-sm sm:text-base")}>
                    {document.title}
                  </p>
                  {!compact && document.facility_name && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">{document.facility_name}</p>
                  )}
                </div>
              </div>
              <div className={cn("flex flex-col gap-1.5 sm:gap-2", compact ? "items-end flex-shrink-0" : "w-full")}>
                <div className="flex gap-1.5 flex-wrap">
                  {document.document_date && (
                    <Badge variant="outline" className="text-xs border-gray-300">
                      {format(new Date(document.document_date), compact ? 'MMM d' : 'MMM d, yyyy')}
                    </Badge>
                  )}
                  {!compact && document.document_type && (
                    <Badge variant="outline" className="text-xs capitalize border-gray-300">
                      {document.document_type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                {getStatusBadge(document.status)}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 m-2 rounded-xl flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView(document)}>View Details</DropdownMenuItem>
              {document.status === 'failed' && onReprocess && (
                <DropdownMenuItem onClick={() => onReprocess(document)} className="text-blue-600">
                  Reprocess Document
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(document)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}