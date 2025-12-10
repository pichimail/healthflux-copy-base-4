import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function DocumentSearchBar({ profileId, onResultClick }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', profileId],
    queryFn: () => base44.entities.MedicalDocument.filter({ profile_id: profileId }, '-created_date'),
    enabled: !!profileId
  });

  const searchResults = query.length > 2
    ? documents.filter(doc => 
        doc.title?.toLowerCase().includes(query.toLowerCase()) ||
        doc.ai_summary?.toLowerCase().includes(query.toLowerCase()) ||
        doc.facility_name?.toLowerCase().includes(query.toLowerCase()) ||
        doc.doctor_name?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="relative mb-6">
      <div className="relative">
        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-500" />
        <Input
          placeholder="AI-powered search across all documents..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="pl-12 h-14 text-base rounded-2xl border-2 border-purple-200 focus:border-purple-400"
        />
      </div>

      {showResults && searchResults.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 border-2 border-purple-200 shadow-lg rounded-2xl overflow-hidden">
          <div className="divide-y">
            {searchResults.map(doc => (
              <div
                key={doc.id}
                className="p-4 hover:bg-purple-50 cursor-pointer transition-colors"
                onClick={() => {
                  onResultClick(doc);
                  setQuery('');
                  setShowResults(false);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{doc.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {doc.ai_summary || doc.notes || 'No summary available'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {doc.document_type?.replace(/_/g, ' ')}
                      </Badge>
                      {doc.document_date && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(doc.document_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}