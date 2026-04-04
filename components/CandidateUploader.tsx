import React, { useCallback, useState } from 'react';
import JSZip from 'jszip';

interface CandidateUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onSourceUrl: (url: string) => Promise<void>;
  creditLimit: number;
  onLimitExceeded: (ignoredCount: number) => void;
  user: any;
  onSignUpRequest: () => void;
  readOnly?: boolean;
}

const sourcePortals = [
    { name: "LinkedIn", url: "https://www.linkedin.com/jobs/" },
    { name: "Indeed", url: "https://www.indeed.com/" },
    { name: "Naukri", url: "https://www.naukri.com/" },
    { name: "GitHub", url: "https://github.com/" },
];

const CandidateUploader: React.FC<CandidateUploaderProps> = ({ files, onFilesChange, onSourceUrl, creditLimit, onLimitExceeded, user, onSignUpRequest, readOnly }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'source'>('upload');
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [isSourcing, setIsSourcing] = useState(false);
  const [url, setUrl] = useState('');

  const availableSlots = creditLimit - files.length;

  const processFiles = useCallback(async (newFiles: File[]) => {
    if (readOnly) return;
    const filesToProcess = newFiles.slice(0, Math.max(0, availableSlots));

    const ignoredCount = newFiles.length - filesToProcess.length;
    if (ignoredCount > 0) {
      onLimitExceeded(ignoredCount);
    }
    
    if (filesToProcess.length === 0) return;

    setIsProcessingZip(true);
    const processedFiles: File[] = [];

    for (const file of filesToProcess) {
        if (file.name.endsWith('.zip') || file.type.includes('zip')) {
            try {
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(file);
                
                const filePromises: Promise<void>[] = [];
                zipContent.forEach((relativePath, zipEntry) => {
                    if (!zipEntry.dir && !zipEntry.name.startsWith('__MACOSX') && !zipEntry.name.startsWith('.') && processedFiles.length < availableSlots) {
                         const promise = async () => {
                             const blob = await zipEntry.async('blob');
                             const extractedFile = new File([blob], zipEntry.name.split('/').pop() || zipEntry.name, { 
                                 type: 'application/octet-stream'
                             });
                             if (extractedFile.name.match(/\.(pdf|doc|docx|txt)$/i)) {
                                 processedFiles.push(extractedFile);
                             }
                         };
                         filePromises.push(promise());
                    }
                });
                await Promise.all(filePromises);
            } catch (e) {
                console.error("Failed to unzip", e);
            }
        } else {
            processedFiles.push(file);
        }
    }
    
    onFilesChange((currentFiles) => [...currentFiles, ...processedFiles]);
    setIsProcessingZip(false);
  }, [onFilesChange, availableSlots, onLimitExceeded, readOnly]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (readOnly || availableSlots <= 0) return;
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length) {
      processFiles(droppedFiles);
    }
  }, [processFiles, availableSlots, readOnly]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (event.target.files) {
      processFiles(Array.from(event.target.files));
    }
    event.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    if (readOnly) return;
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  const handleSource = async () => {
      if (readOnly || !url.trim() || isSourcing || availableSlots <= 0) return;
      setIsSourcing(true);
      try {
          await onSourceUrl(url);
          setUrl('');
      } catch (e) {
          console.error("Sourcing failed", e);
      } finally {
          setIsSourcing(false);
      }
  };

  const renderIcon = (file: File) => {
    if (file.name.startsWith('Sourced_Profile_')) {
        return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
    }
    return <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  };

  const AnonymousCTA = () => (
    <div 
        className={`flex-1 border-2 border-dashed border-[#334155] rounded-xl flex flex-col items-center justify-center p-4 text-center transition-all group min-h-[100px] bg-indigo-900/10 border-indigo-500/30`}
    >
        <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-2"><svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
        <p className="text-indigo-300 font-semibold text-sm mb-2">Create an account to get started</p>
        <button onClick={onSignUpRequest} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20">
            Sign Up for 10 Free Credits
        </button>
    </div>
  );

  return (
    <div className={`bg-[#0f172a] rounded-xl border border-[#1e293b] overflow-hidden flex flex-col h-full shadow-sm ${readOnly ? 'opacity-70' : ''}`}>
       <div className="px-4 py-3 border-b border-[#1e293b] bg-[#1e293b]/30 shrink-0 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            2. Candidate Pool
        </h3>
        <div className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-slate-800 border border-slate-700 rounded-md">
            <span className="text-slate-200">{availableSlots < 0 ? 0 : availableSlots}</span>
            <span className="text-slate-500">/{creditLimit} Credits</span>
        </div>
      </div>

        <div className="p-2">
            <div className="flex bg-surface p-1 rounded-lg border border-border gap-1">
                <button 
                    onClick={() => !readOnly && setActiveTab('upload')} 
                    className={`flex-1 text-center text-[10px] sm:text-xs font-bold py-2 rounded-md transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-700'} ${readOnly ? 'cursor-not-allowed' : ''}`}
                >
                    Upload Files
                </button>
                <button 
                    onClick={() => !readOnly && setActiveTab('source')} 
                    className={`flex-1 text-center text-[10px] sm:text-xs font-bold py-2 rounded-md transition-all ${activeTab === 'source' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-700'} ${readOnly ? 'cursor-not-allowed' : ''}`}
                >
                    Source URL
                </button>
            </div>
        </div>

      <div className="p-3 pt-1 flex flex-col flex-1 gap-2 min-h-[150px] relative">
        
        {activeTab === 'source' && (
            <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-500 px-1">Paste a public profile URL (e.g., LinkedIn) to have AI analyze it.</p>
                <div className="flex gap-2">
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.linkedin.com/in/..." className="flex-1 bg-background border border-border rounded-lg px-3 text-sm focus:border-indigo-500/50 outline-none disabled:opacity-50" disabled={availableSlots <= 0 || readOnly} />
                    <button onClick={handleSource} disabled={isSourcing || !url || availableSlots <= 0 || readOnly} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                        {isSourcing && <div className="w-3 h-3 border-t-white border-2 border-white/50 rounded-full animate-spin"></div>}
                        Analyze
                    </button>
                </div>
                <div className="px-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-2">Quick Links to Find Profiles</p>
                    <div className="flex flex-wrap gap-2">
                        {sourcePortals.map(p => (
                             <a href={p.url} target="_blank" rel="noopener noreferrer" key={p.name} className="flex items-center gap-1.5 text-center px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-border rounded-md text-[10px] font-bold text-slate-300 transition-colors">
                                {p.name}
                                <svg className="w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </a>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {files.length === 0 ? (
            activeTab === 'upload' && (
                !user && creditLimit === 0 ? <AnonymousCTA /> :
                <div 
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    className={`flex-1 border-2 border-dashed border-[#334155] rounded-xl flex flex-col items-center justify-center p-4 text-center transition-all group min-h-[100px] 
                                ${!readOnly ? 'cursor-pointer hover:border-indigo-500/50 bg-[#1e293b]/20 hover:bg-[#1e293b]/40' : 'cursor-not-allowed'}
                                ${availableSlots <= 0 && 'opacity-60 !cursor-not-allowed'}`}
                    onClick={() => !readOnly && availableSlots > 0 && document.getElementById('file-upload-input')?.click()}
                >
                    <input id="file-upload-input" type="file" multiple accept=".pdf,.doc,.docx,.txt,.zip" onChange={handleFileChange} className="hidden" disabled={availableSlots <= 0 || readOnly} />
                    {isProcessingZip ? (
                        <div className="flex flex-col items-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div><p className="text-indigo-400 font-bold text-xs">Processing...</p></div>
                    ) : availableSlots <= 0 ? (
                         <>
                            <div className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center mb-2"><svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                            <p className="text-amber-400 font-semibold text-sm mb-1">Credit Limit Reached</p>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">Please analyze or clear files.</p>
                         </>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
                            <p className="text-slate-200 font-semibold text-sm mb-1">Drop files or click to upload</p>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">You can add {availableSlots} more CVs</p>
                        </>
                    )}
                </div>
            )
        ) : (
            <div className={`flex flex-col gap-2 flex-1`}>
                <div className={`flex-1 bg-[#020617] rounded-xl border border-[#1e293b] p-2 overflow-y-auto custom-scrollbar`}>
                    <div className="flex justify-between items-center mb-2 px-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{files.length} Candidates Added</span>
                        <button onClick={() => !readOnly && onFilesChange([])} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider font-bold disabled:opacity-50" disabled={readOnly}>Clear All</button>
                    </div>
                    <div className="space-y-1.5">
                        {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-[#0f172a] p-2 rounded border border-[#1e293b] group hover:border-indigo-500/30 transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-6 h-6 rounded bg-[#1e293b] flex items-center justify-center text-slate-500 shrink-0">{renderIcon(file)}</div>
                                <span className="text-xs text-slate-300 truncate font-medium max-w-[200px]">{file.name}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(index); }} disabled={readOnly} className="p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        ))}
                    </div>
                </div>
                {availableSlots > 0 && activeTab === 'upload' && (
                    <div onClick={() => !readOnly && document.getElementById('file-upload-input-more')?.click()} className={`shrink-0 text-center p-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 text-xs font-bold transition-colors ${!readOnly && 'hover:border-indigo-500/50 hover:text-white cursor-pointer'}`}>
                        Add More Files ({availableSlots} remaining)
                        <input id="file-upload-input-more" type="file" multiple accept=".pdf,.doc,.docx,.txt,.zip" onChange={handleFileChange} className="hidden" disabled={availableSlots <= 0 || readOnly} />
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default CandidateUploader;