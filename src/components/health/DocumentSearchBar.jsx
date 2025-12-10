import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Sparkles, X, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export default function DocumentSearchBar({ profileId, onResultClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery) => {
      if (!profileId) throw new Error("No profile selected for search.");
      
      const { data } = await base44.functions.invoke('aiDocumentSearch', {
        profile_id: profileId,
        query: searchQuery
      });
      return data.results;
    },
    onSuccess: (data) => {
      setResults(data);
      setShowResults(true);
    },
    onError: (error) => {
      console.error("AI Document Search failed:", error);
      setResults([]);
      setShowResults(true);
    }
  });

  const handleSearch = () => {
    if (query.trim()) {
      searchMutation.mutate(query);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleResultClick = (doc) => {
    onResultClick(doc);
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative mb-4 sm:mb-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500" />
          <Input
            placeholder="Smart search documents..."
            className="pl-10 h-11 sm:h-12 rounded-2xl border-2 border-violet-200 focus-visible:ring-violet-300 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-2xl h-11 sm:h-12 px-4 sm:px-6 active-press shadow-lg"
        >
          {searchMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </Button>
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            className="h-10 w-10 sm:h-11 sm:w-11 text-gray-500 hover:text-gray-700 rounded-2xl"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-2 shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden animate-slide-in-up">
          <CardContent className="p-0">
            <ScrollArea className="max-h-64 sm:max-h-72">
              {results.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-[#F4F4F2] active:bg-gray-200 cursor-pointer border-b last:border-b-0 active-press"
                  onClick={() => handleResultClick(doc)}
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#0A0A0A] truncate">{doc.title}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {doc.ai_summary ? doc.ai_summary.substring(0, 50) + '...' : doc.facility_name || 'No details'}
                    </p>
                  </div>
                  {doc.document_date && (
                    <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">
                      {format(new Date(doc.document_date), 'MMM d')}
                    </span>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {showResults && results.length === 0 && !searchMutation.isPending && query && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-2 shadow-xl rounded-2xl p-3 sm:p-4 text-center text-gray-600 text-sm animate-fade-in">
          No documents found
        </Card>
      )}
    </div>
  );
}