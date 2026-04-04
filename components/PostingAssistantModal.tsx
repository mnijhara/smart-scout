import React, { useState, useEffect } from 'react';
import { generatePostingContent } from '../services/geminiService';
import { PostingContent } from '../types';

interface PostingAssistantModalProps {
    jobDescription: string;
    onClose: () => void;
    isDemo?: boolean;
}

const jobPortals = [
    { name: "LinkedIn", url: "https://www.linkedin.com/jobs/post/" },
    { name: "Naukri", url: "https://www.naukri.com/post-job-login" },
    { name: "IIMjobs", url: "https://www.iimjobs.com/post-job.php" },
    { name: "Indeed", url: "https://www.indeed.com/hire" },
    { name: "Shine.com", url: "https://recruiter.shine.com/job-posting/" }
];

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button onClick={handleCopy} className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-md transition-all duration-200 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
};

const PostingAssistantModal: React.FC<PostingAssistantModalProps> = ({ jobDescription, onClose, isDemo }) => {
    const [content, setContent] = useState<PostingContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isDemo) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isDemo, onClose]);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const generatedContent = await generatePostingContent(jobDescription);
                setContent(generatedContent);
            } catch (error) {
                console.error("Failed to generate posting content:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [jobDescription]);

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={isDemo ? undefined : onClose}>
            <div className="bg-surface rounded-xl border border-border w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                         <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        AI Posting Assistant
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                             <div className="flex flex-col items-center gap-2 text-indigo-400">
                                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">Generating Content...</span>
                            </div>
                        </div>
                    ) : content ? (
                        <>
                            <div>
                                <h4 className="font-semibold text-slate-300 mb-3">1. Post on Job Portals</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {jobPortals.map(portal => (
                                        <a href={portal.url} target="_blank" rel="noopener noreferrer" key={portal.name} className="flex items-center justify-center gap-2 text-center px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-border rounded-lg text-sm font-medium text-white transition-colors">
                                            {portal.name}
                                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-300 mb-2">2. Copy Optimized Content</h4>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                     <div className="space-y-4">
                                         <div>
                                            <label className="text-xs font-bold text-slate-400">Optimized Titles</label>
                                             <div className="mt-2 space-y-2">
                                                {content.titles.map((title, i) => (
                                                    <div key={i} className="relative">
                                                        <input type="text" readOnly value={title} className="w-full bg-background border border-border rounded-md p-2 text-sm text-slate-200 pr-16"/>
                                                        <CopyButton text={title} />
                                                    </div>
                                                ))}
                                             </div>
                                         </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400">Social Summary (with hashtags)</label>
                                            <div className="relative mt-2">
                                                <textarea readOnly value={content.summary} className="w-full h-32 bg-background border border-border rounded-md p-2 text-sm text-slate-300 resize-none" />
                                                 <CopyButton text={content.summary} />
                                            </div>
                                        </div>
                                     </div>
                                     <div className="space-y-4">
                                        <div>
                                             <label className="text-xs font-bold text-slate-400">Full Job Description</label>
                                             <div className="relative mt-2">
                                                 <textarea readOnly value={jobDescription} className="w-full h-32 bg-background border border-border rounded-md p-2 text-sm text-slate-300 resize-none" />
                                                 <CopyButton text={jobDescription} />
                                             </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400">Keywords & Skills</label>
                                            <div className="relative mt-2">
                                                <div className="p-3 min-h-[114px] bg-background border border-border rounded-md flex flex-wrap gap-2">
                                                    {content.keywords.map(kw => <span key={kw} className="px-2 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-medium rounded-md border border-indigo-500/20">{kw}</span>)}
                                                </div>
                                                <CopyButton text={content.keywords.join(', ')} />
                                            </div>
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </>
                    ) : <p className="text-center text-slate-400">Could not generate content.</p>}
                </div>

                <div className="p-4 border-t border-border flex justify-end shrink-0 bg-surface/50">
                    <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostingAssistantModal;