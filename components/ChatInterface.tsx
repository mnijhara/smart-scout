import React, { useState, useRef, useEffect } from 'react';
import { ResumeAnalysis, ChatMessage } from '../types';
import { startChatStream } from '../services/geminiService';
import { marked } from 'marked';

interface ChatInterfaceProps {
  jobDescription: string;
  analysisResults: ResumeAnalysis[];
  initialMessage: ChatMessage | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ jobDescription, analysisResults, initialMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll if messages exist
    if (messages.length > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  useEffect(() => {
    if (initialMessage) {
      setMessages([initialMessage]);
    } else {
      setMessages([]);
    }
  }, [initialMessage]);

  const processAndSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    setError(null);
    setInput(''); 

    try {
      const historyForAPI = messages.concat(userMessage);
      const stream = await startChatStream(jobDescription, analysisResults, historyForAPI, messageText);
      
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if(chunkText) {
          fullResponse += chunkText;
          setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1].text = fullResponse;
              return newMessages;
          });
        }
      }
    } catch (err: any) {
      setError('Connection interrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processAndSendMessage(input);
  };
  
  const suggestedQuestions = ["Compare top candidates", "Identify skill gaps", "Draft interview questions"];

  const renderMessageContent = (text: string) => {
    return <div className="prose prose-invert prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: marked.parse(text) as string }} />;
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden mt-8 border border-[#1e293b] bg-[#020617]">
      <div className="p-4 border-b border-[#1e293b] bg-[#0f172a] flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Assistant</h2>
      </div>
      
      <div className="h-[400px] overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[#020617]">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            <p className="text-sm text-slate-400 font-medium">Ask for insights on your candidate pool</p>
            <div className="flex gap-2 mt-6">
                {suggestedQuestions.map((q, i) => (
                    <button key={i} onClick={() => processAndSendMessage(q)} className="px-3 py-1.5 rounded-full bg-[#1e293b] hover:bg-[#334155] text-xs text-slate-300 border border-[#334155] transition-colors">{q}</button>
                ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm shadow-md ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                : 'bg-[#1e293b] text-slate-200 rounded-tl-sm border border-[#334155]'
            }`}>
              {msg.role === 'user' ? msg.text : renderMessageContent(msg.text)}
            </div>
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
             <div className="px-4 py-3 rounded-2xl bg-[#1e293b] rounded-tl-sm border border-[#334155]">
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#1e293b] bg-[#0f172a]">
        <form onSubmit={handleFormSubmit} className="flex gap-3">
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the candidates..."
            className="flex-grow bg-[#1e293b] border border-[#334155] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
            disabled={isLoading}
            />
            <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 bg-white text-black rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center disabled:opacity-50 disabled:bg-slate-600 disabled:text-slate-400 shadow-lg"
            >
            <svg className="w-5 h-5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;