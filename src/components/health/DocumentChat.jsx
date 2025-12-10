import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function DocumentChat({ document, profileId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await base44.functions.invoke('askDocumentQuestion', {
        document_id: document.id,
        profile_id: profileId,
        question: input,
        conversation_history: messages
      });

      const aiMessage = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Document chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b">
        <h3 className="font-semibold text-[#0A0A0A] flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          Ask AI About This Document
        </h3>
        <p className="text-xs text-gray-600 mt-1">Get instant answers about {document.title}</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">Ask me anything about this document</p>
            <div className="space-y-2">
              <button 
                onClick={() => setInput("What are the key findings in this document?")}
                className="block w-full text-left text-sm p-2 rounded-lg bg-[#F4F4F2] hover:bg-gray-200 transition-colors"
              >
                What are the key findings?
              </button>
              <button 
                onClick={() => setInput("Are there any concerning results?")}
                className="block w-full text-left text-sm p-2 rounded-lg bg-[#F4F4F2] hover:bg-gray-200 transition-colors"
              >
                Are there any concerning results?
              </button>
              <button 
                onClick={() => setInput("What should I do based on these results?")}
                className="block w-full text-left text-sm p-2 rounded-lg bg-[#F4F4F2] hover:bg-gray-200 transition-colors"
              >
                What should I do next?
              </button>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 mb-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-violet-600" />
              </div>
            )}
            <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
              msg.role === 'user' 
                ? 'bg-[#0A0A0A] text-white' 
                : 'bg-violet-50 text-[#0A0A0A]'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-violet-600" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-violet-50">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this document..."
            className="flex-1 rounded-xl"
            disabled={loading}
          />
          <Button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-700 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}