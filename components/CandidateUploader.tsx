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
  { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/' },
  { name: 'Indeed', url: 'https://www.indeed.com/' },
  { name: 'Naukri', url: 'https://www.naukri.com/' },
  { name: 'GitHub', url: 'https://github.com/' },
];

const CandidateUploader: React.FC<CandidateUploaderProps> = ({
  files,
  onFilesChange,
  onSourceUrl,
  creditLimit,
  onLimitExceeded,
  user,
  onSignUpRequest,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'source'>('upload');
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [isSourcing, setIsSourcing] = useState(false);
  const [url, setUrl] = useState('');

  const availableSlots = Math.max(0, creditLimit - files.length);

  const processFiles = useCallback(
    async (newFiles: File[]) => {
      if (readOnly || availableSlots <= 0) return;

      const filesToProcess = newFiles.slice(0, availableSlots);
      const ignoredCount = newFiles.length - filesToProcess.length;
      if (ignoredCount > 0) onLimitExceeded(ignoredCount);
      if (filesToProcess.length === 0) return;

      setIsProcessingZip(true);
      const processedFiles: File[] = [];

      try {
        for (const file of filesToProcess) {
          if (!file.name.toLowerCase().endsWith('.zip') && !file.type.includes('zip')) {
            if (processedFiles.length < availableSlots) processedFiles.push(file);
            continue;
          }

          try {
            const zip = await new JSZip().loadAsync(file);
            const entries = Object.values(zip.files).filter(
              (entry) =>
                !entry.dir &&
                !entry.name.startsWith('__MACOSX/') &&
                !entry.name.startsWith('.') &&
                /\.(pdf|doc|docx|txt)$/i.test(entry.name),
            );

            for (const entry of entries) {
              if (processedFiles.length >= availableSlots) break;
              const blob = await entry.async('blob');
              const filename = entry.name.split('/').pop() || entry.name;
              processedFiles.push(
                new File([blob], filename, { type: 'application/octet-stream' }),
              );
            }
          } catch (error) {
            console.error('Failed to unzip candidate archive', error);
          }
        }

        onFilesChange([...files, ...processedFiles.slice(0, availableSlots)]);
      } finally {
        setIsProcessingZip(false);
      }
    },
    [availableSlots, files, onFilesChange, onLimitExceeded, readOnly],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (readOnly || availableSlots <= 0) return;
      const droppedFiles = Array.from(event.dataTransfer.files);
      if (droppedFiles.length > 0) void processFiles(droppedFiles);
    },
    [availableSlots, processFiles, readOnly],
  );

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!readOnly && event.target.files) void processFiles(Array.from(event.target.files));
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    if (readOnly) return;
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSource = async () => {
    const sourceUrl = url.trim();
    if (readOnly || !sourceUrl || isSourcing || availableSlots <= 0) return;

    setIsSourcing(true);
    try {
      await onSourceUrl(sourceUrl);
      setUrl('');
    } catch (error) {
      console.error('Sourcing failed', error);
    } finally {
      setIsSourcing(false);
    }
  };

  const renderIcon = (file: File) => {
    if (file.name.startsWith('Sourced_Profile_')) {
      return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    }

    return (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const anonymousCta = (
    <div className="flex min-h-[100px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-900/10 p-4 text-center">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
        <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <p className="mb-2 text-sm font-semibold text-indigo-300">Create an account to get started</p>
      <button
        type="button"
        onClick={onSignUpRequest}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700"
      >
        Sign Up for 10 Free Credits
      </button>
    </div>
  );

  const uploadDropzone = (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={() => {
        if (!readOnly && availableSlots > 0) document.getElementById('file-upload-input')?.click();
      }}
      className={`flex min-h-[100px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#334155] p-4 text-center transition-all ${
        !readOnly && availableSlots > 0
          ? 'cursor-pointer bg-[#1e293b]/20 hover:border-indigo-500/50 hover:bg-[#1e293b]/40'
          : 'cursor-not-allowed opacity-60'
      }`}
    >
      <input
        id="file-upload-input"
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.zip"
        onChange={handleFileChange}
        className="hidden"
        disabled={availableSlots <= 0 || readOnly}
      />
      {isProcessingZip ? (
        <div className="flex flex-col items-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-bold text-indigo-400">Processing...</p>
        </div>
      ) : availableSlots <= 0 ? (
        <>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b]">
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-amber-400">Credit Limit Reached</p>
          <p className="font-mono text-[10px] uppercase text-slate-500">Please analyze or clear files.</p>
        </>
      ) : (
        <>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b]">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-slate-200">Drop files or click to upload</p>
          <p className="font-mono text-[10px] uppercase text-slate-500">You can add {availableSlots} more CVs</p>
        </>
      )}
    </div>
  );

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-xl border border-[#1e293b] bg-[#0f172a] shadow-sm ${readOnly ? 'opacity-70' : ''}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-[#1e293b] bg-[#1e293b]/30 px-4 py-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          2. Candidate Pool
        </h3>
        <div className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-bold uppercase tracking-wider">
          <span className="text-slate-200">{availableSlots}</span>
          <span className="text-slate-500">/{creditLimit} Credits</span>
        </div>
      </div>

      <div className="p-2">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => !readOnly && setActiveTab('upload')}
            className={`flex-1 rounded-md py-2 text-center text-[10px] font-bold transition-all sm:text-xs ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-700'} ${readOnly ? 'cursor-not-allowed' : ''}`}
          >
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => !readOnly && setActiveTab('source')}
            className={`flex-1 rounded-md py-2 text-center text-[10px] font-bold transition-all sm:text-xs ${activeTab === 'source' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-700'} ${readOnly ? 'cursor-not-allowed' : ''}`}
          >
            Source URL
          </button>
        </div>
      </div>

      <div className="relative flex min-h-[150px] flex-1 flex-col gap-2 p-3 pt-1">
        {activeTab === 'source' && (
          <div className="flex flex-col gap-3">
            <p className="px-1 text-xs text-slate-500">Paste a public profile URL (e.g., LinkedIn) to have AI analyze it.</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.linkedin.com/in/..."
                className="flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-indigo-500/50 disabled:opacity-50"
                disabled={availableSlots <= 0 || readOnly}
              />
              <button
                type="button"
                onClick={() => void handleSource()}
                disabled={isSourcing || !url.trim() || availableSlots <= 0 || readOnly}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSourcing && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-white" />}
                Analyze
              </button>
            </div>
            <div className="px-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">Quick Links to Find Profiles</p>
              <div className="flex flex-wrap gap-2">
                {sourcePortals.map((portal) => (
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={portal.name}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-slate-800 px-2 py-1 text-center text-[10px] font-bold text-slate-300 transition-colors hover:bg-slate-700"
                  >
                    {portal.name}
                    <svg className="h-2.5 w-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {files.length === 0 ? (
          activeTab === 'upload' ? (!user && creditLimit === 0 ? anonymousCta : uploadDropzone) : null
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <div className="custom-scrollbar flex-1 overflow-y-auto rounded-xl border border-[#1e293b] bg-[#020617] p-2">
              <div className="mb-2 flex items-center justify-between px-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{files.length} Candidates Added</span>
                <button
                  type="button"
                  onClick={() => !readOnly && onFilesChange([])}
                  disabled={readOnly}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-1.5">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="group flex items-center justify-between rounded border border-[#1e293b] bg-[#0f172a] p-2 transition-colors hover:border-indigo-500/30">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#1e293b] text-slate-500">{renderIcon(file)}</div>
                      <span className="max-w-[200px] truncate text-xs font-medium text-slate-300">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFile(index);
                      }}
                      disabled={readOnly}
                      aria-label={`Remove ${file.name}`}
                      className="rounded p-0.5 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {availableSlots > 0 && activeTab === 'upload' && (
              <div
                onClick={() => !readOnly && document.getElementById('file-upload-input-more')?.click()}
                className={`shrink-0 rounded-lg border-2 border-dashed border-slate-700 p-2 text-center text-xs font-bold text-slate-400 transition-colors ${!readOnly ? 'cursor-pointer hover:border-indigo-500/50 hover:text-white' : 'cursor-not-allowed'}`}
              >
                Add More Files ({availableSlots} remaining)
                <input
                  id="file-upload-input-more"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={readOnly || availableSlots <= 0}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateUploader;
