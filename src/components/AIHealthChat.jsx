import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function AIHealthChat({ profileId }) {
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
      const { data } = await base44.functions.invoke('aiHealthChat', {
        question: input,
        profile_id: profileId
      });

      const aiMessage = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
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
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Ask me anything about your health data</p>
            <p className="text-xs text-gray-500 mt-2">
              Example: "What's my average blood pressure this month?"
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-[#9BB4FF] flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-[#0A0A0A]" />
              </div>
            )}
            <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
              msg.role === 'user' 
                ? 'bg-[#0A0A0A] text-white' 
                : 'bg-[#F4F4F2] text-[#0A0A0A]'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
            <div className="w-8 h-8 rounded-full bg-[#9BB4FF] flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-[#0A0A0A]" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-[#F4F4F2]">
              <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your health data..."
            className="flex-1 rounded-xl"
            disabled={loading}
          />
          <Button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-[#0A0A0A] hover:bg-[#111111] rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}