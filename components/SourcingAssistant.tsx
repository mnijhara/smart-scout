import React, { useState } from 'react';
import { Search, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { generateSourcingQueries } from '../services/geminiService';

interface SourcingAssistantProps {
  jobDescription: string;
}

const SourcingAssistant: React.FC<SourcingAssistantProps> = ({ jobDescription }) => {
  const [queries, setQueries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateQueries = async () => {
    setIsLoading(true);
    try {
      const generatedQueries = await generateSourcingQueries(jobDescription);
      setQueries(generatedQueries);
    } catch (error) {
      console.error("Failed to generate queries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500" />
          Sourcing Assistant
        </h3>
        <button
          onClick={handleGenerateQueries}
          disabled={isLoading || !jobDescription.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Search Queries'}
        </button>
      </div>

      {queries.length > 0 && (
        <div className="space-y-3">
          {queries.map((query, index) => (
            <div key={index} className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <p className="text-sm text-slate-300 font-mono break-all">{query}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(query)}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest"
                >
                  <ExternalLink className="w-3 h-3" /> Search Google
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourcingAssistant;
