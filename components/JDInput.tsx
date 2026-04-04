import React, { useState } from 'react';
import { analyzeJobDescription } from '../services/geminiService';

interface JDInputProps {
  value: string;
  onChange: (value: string) => void;
  onFileChange: (file: File) => void;
  readOnly?: boolean;
  onEdit?: () => void;
  onOpenPostingAssistant?: () => void;
}

const JDInput: React.FC<JDInputProps> = ({ value, onChange, onFileChange, readOnly, onEdit, onOpenPostingAssistant }) => {
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [jdSuggestions, setJdSuggestions] = useState<string[]>([]);
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoadingMessage(`Parsing ${file.name}...`);
      await onFileChange(file);
      setLoadingMessage(null);
    }
    event.target.value = '';
  };

  const handleAnalyzeJd = async () => {
      if (!value.trim()) return;
      setLoadingMessage('Analyzing JD...');
      setJdSuggestions([]);
      try {
        const { suggestions } = await analyzeJobDescription(value);
        setJdSuggestions(suggestions);
      } catch (e) {
        console.error("JD Analysis failed", e);
        setJdSuggestions(["AI analysis failed. Please try again."]);
      } finally {
        setLoadingMessage(null);
      }
  };

  return (
    <div className={`bg-[#0f172a] rounded-xl border border-[#1e293b] overflow-hidden flex flex-col h-full shadow-sm transition-all duration-300 ${readOnly ? 'opacity-70' : ''}`}>
      <div className="px-4 py-3 border-b border-[#1e293b] flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#1e293b]/30 shrink-0 gap-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          1. Job Description
        </h3>
        {readOnly ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {onOpenPostingAssistant && (
                    <button onClick={onOpenPostingAssistant} className="flex-1 sm:flex-none px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        Posting Assistant
                    </button>
                )}
                <button onClick={onEdit} className="flex-1 sm:flex-none px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                    Edit
                </button>
            </div>
        ) : (
            <label className="w-full sm:w-auto cursor-pointer px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload JD
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
            </label>
        )}
      </div>

      <div className="relative flex-1 p-3 min-h-0 flex flex-col gap-2">
        {loadingMessage && (
            <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-3 text-indigo-400">
                    <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold uppercase tracking-widest">{loadingMessage}</span>
                </div>
            </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste the full job description here, or upload a file."
          className="w-full h-full bg-[#020617] text-slate-300 p-3 rounded-lg border border-[#1e293b] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none resize-none text-sm leading-relaxed placeholder:text-slate-600 transition-all font-mono read-only:bg-slate-800/20 read-only:text-slate-400"
          readOnly={readOnly}
        />
        {!readOnly && value.length > 50 && (
            <div className="flex-shrink-0 flex gap-2">
                <button 
                    onClick={handleAnalyzeJd} 
                    disabled={!!loadingMessage}
                    className="w-full text-center py-2 px-3 text-xs font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                    Improve JD Suggestions
                </button>
            </div>
        )}
         {jdSuggestions.length > 0 && (
            <div className="flex-shrink-0 bg-slate-800/50 p-3 rounded-lg border border-slate-700 animate-fadeIn">
                <div className="flex justify-between items-center mb-2">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Suggestions</h4>
                     <button onClick={() => setJdSuggestions([])} className="text-slate-500 hover:text-white text-xs">✕</button>
                </div>
                <ul className="space-y-2">
                    {jdSuggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                           <span className="text-indigo-400 mt-0.5">▪</span> {s}
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};

export default JDInput;