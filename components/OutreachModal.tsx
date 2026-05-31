import React, { useState, useEffect } from 'react';
import { generateOutreachEmail } from '../services/geminiService';
import { ResumeAnalysis } from '../types';
import { DUMMY_OUTREACH_EMAIL } from '../utils/demoData';

interface OutreachModalProps {
    jobDescription: string;
    candidate: ResumeAnalysis;
    onClose: () => void;
    isDemo?: boolean;
}

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

const OutreachModal: React.FC<OutreachModalProps> = ({ jobDescription, candidate, onClose, isDemo }) => {
    const [emailContent, setEmailContent] = useState<{ subject: string; body: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEmail = async () => {
            if (isDemo) {
                // Bypass loading for demo to show email instantly
                setEmailContent(DUMMY_OUTREACH_EMAIL);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const content = await generateOutreachEmail(jobDescription, candidate);
                setEmailContent(content);
            } catch (error) {
                console.error("Failed to generate outreach email:", error);
                setEmailContent({ subject: "Error", body: "Could not generate email content." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchEmail();
    }, [jobDescription, candidate, isDemo]);

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" onClick={isDemo ? undefined : onClose}>
            <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        AI Outreach Assistant
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                             <div className="flex flex-col items-center gap-2 text-indigo-400">
                                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">Drafting Email...</span>
                            </div>
                        </div>
                    ) : emailContent ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400">Subject</label>
                                <div className="relative mt-2">
                                    <input type="text" readOnly value={emailContent.subject} className="w-full bg-background border border-border rounded-md p-2 text-sm text-slate-200 pr-16"/>
                                    <CopyButton text={emailContent.subject} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400">Body</label>
                                <div className="relative mt-2">
                                    <textarea readOnly value={emailContent.body} className="w-full h-64 bg-background border border-border rounded-md p-2 text-sm text-slate-300 resize-none font-sans leading-relaxed" />
                                    <CopyButton text={emailContent.body} />
                                </div>
                            </div>
                        </div>
                    ) : <p className="text-center text-slate-400">Could not generate email content.</p>}
                </div>

                <div className="p-4 border-t border-border flex justify-end gap-3 shrink-0 bg-surface/50">
                    {emailContent && (
                        <button 
                            onClick={() => {
                                const text = encodeURIComponent(`Subject: ${emailContent.subject}\n\n${emailContent.body}`);
                                window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.802.001-2.618-1.01-5.08-2.86-6.931-1.85-1.85-4.311-2.862-6.93-2.863-5.41 0-9.808 4.397-9.81 9.81-.001 1.73.457 3.42 1.32 4.927l-.994 3.634 3.733-.979zm11.233-7.234c.3-.15.495-.247.585-.397.09-.15.09-.87-.075-1.35-.165-.48-.675-.675-.975-.825-.3-.15-1.275-.47-2.43-.15-1.155.32-2.13 1.055-2.85 1.775-.72.72-2.31 3.54-2.31 5.34 0 1.8 1.17 2.685 1.59 3.135.42.45.825.375 1.125.225.3-.15.675-.675.825-.975.15-.3.225-.6.075-.9-.15-.3-.675-.825-.975-1.125-.3-.3-.63-.45-.3-.975.33-.525.96-1.545 1.395-2.025.435-.48.675-.375.975-.225z"/></svg>
                            Share on WhatsApp
                        </button>
                    )}
                    <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OutreachModal;