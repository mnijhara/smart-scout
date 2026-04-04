import React, { useState, useEffect } from 'react';
import { ResumeAnalysis, InterviewPlaybook, TalentDensityReport } from '../types';
import ChatInterface from './ChatInterface';
import { generateComparisonReport, generateExportReport, generateInterviewPlaybook } from '../services/geminiService';
import SkeletonLoader from './SkeletonLoader';
import AnalysisProgress from './AnalysisProgress';
import OutreachModal from './OutreachModal';
import { marked } from 'marked';
import { DUMMY_COMPARISON_REPORT } from '../utils/demoData';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; isDemo?: boolean; }> = ({ title, onClose, children, isDemo }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn" onClick={isDemo ? undefined : onClose}>
            <div className="glass-panel border-slate-800/50 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden rounded-3xl" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-950/50">
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h3>
                        <div className="flex items-center space-x-2">
                            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Visual Insights</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">&times;</button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/20">{children}</div>
            </div>
        </div>
    );
};

const TalentDensityCard: React.FC<{ report: TalentDensityReport }> = ({ report }) => {
    const getScoreColor = (score: number) => {
        if (score >= 85) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10 shadow-emerald-500/10';
        if (score >= 70) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 shadow-indigo-500/10';
        if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-amber-500/10';
        return 'text-red-400 border-red-500/30 bg-red-500/10 shadow-red-500/10';
    };

    return (
        <div className="glass-panel border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                 <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black border-2 shrink-0 shadow-xl transition-all group-hover:scale-105 ${getScoreColor(report.talentDensityScore)}`}>
                    {report.talentDensityScore}
                </div>
                <div className="flex-1 space-y-2">
                     <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold text-white uppercase tracking-tight">Talent Density Analysis</h4>
                        <span className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">AI Verified</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed italic font-mono bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">"{report.summary}"</p>
                </div>
            </div>
        </div>
    );
};

const CandidateCard: React.FC<{ 
    result: ResumeAnalysis, 
    onPlaybook: (r: ResumeAnalysis) => void, 
    onOutreach: (r: ResumeAnalysis) => void, 
    onViewText: (t: string) => void, 
    isSelected: boolean, 
    onSelect: (r: ResumeAnalysis) => void,
    onMoveToInterview: (r: ResumeAnalysis) => void
}> = ({ result, onPlaybook, onOutreach, onViewText, isSelected, onSelect, onMoveToInterview }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`glass-panel border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group ${isSelected ? 'border-indigo-500 shadow-2xl shadow-indigo-500/20 bg-indigo-500/5' : 'border-slate-800/50 hover:border-slate-700'}`}>
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                     <input type="checkbox" checked={isSelected} onChange={() => onSelect(result)} className="w-6 h-6 rounded-lg bg-slate-900 border-slate-800 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer shrink-0 transition-all hover:scale-110" />
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 shrink-0 shadow-lg transition-all group-hover:scale-105 ${result.overallScore >= 80 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : result.overallScore >= 50 ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                        {result.overallScore}
                    </div>
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                            <h4 className="text-xl font-bold text-white truncate uppercase tracking-tight">{result.candidateName}</h4>
                            {result.biasAudit && result.biasAudit.score >= 90 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full" title="AI Bias Audit Passed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Fairness Verified</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Source:</span>
                            <p className="text-[9px] text-slate-400 truncate uppercase tracking-widest">{result.fileName}</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3 items-center self-end sm:self-center">
                    <button onClick={(e) => { e.stopPropagation(); onMoveToInterview(result); }} className="px-4 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border border-emerald-400/30 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 uppercase tracking-widest">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                        Interview
                    </button>
                     <button onClick={(e) => { e.stopPropagation(); onOutreach(result); }} className="px-4 py-2 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl border border-indigo-400/30 transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest">
                        Contact
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onPlaybook(result); }} className="px-4 py-2 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all uppercase tracking-widest">
                        Playbook
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onViewText(result.extractedText); }} className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </button>
                    <button onClick={() => setExpanded(!expanded)} className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition-all">
                         <svg className={`w-5 h-5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="mt-8 pt-8 border-t border-slate-800/50 animate-fadeIn space-y-8">
                    <div className="relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30"></div>
                        <p className="text-sm text-slate-400 leading-relaxed bg-slate-950/50 p-6 rounded-xl italic font-mono ml-4 border border-slate-800/30">"{result.summary}"</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                         {Object.entries(result.breakdown).map(([key, val]) => (
                             <div key={key} className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/50 relative overflow-hidden group/item hover:border-indigo-500/30 transition-all">
                                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
                                 <div className="text-[9px] text-slate-600 uppercase font-bold mb-2 tracking-[0.2em] group-hover/item:text-indigo-400 transition-colors">{key}</div>
                                 <div className="text-2xl font-bold text-white">{val}<span className="text-xs text-slate-700 font-normal ml-1">/100</span></div>
                             </div>
                         ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface AnalysisDashboardProps {
    results: ResumeAnalysis[];
    isLoading: boolean;
    progress: { count: number, total: number, fileName: string } | null;
    jobDescription: string;
    onReset: () => void;
    initialChatMessage: any;
    talentDensityReport?: TalentDensityReport | null;
    demoModalSequence?: 'none' | 'intro' | 'posting' | 'sourcing' | 'analysis' | 'results' | 'comparison' | 'outreach';
    onMoveToInterview: (candidate: ResumeAnalysis) => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ results, isLoading, progress, jobDescription, onReset, initialChatMessage, talentDensityReport, demoModalSequence, onMoveToInterview }) => {
    const [playbook, setPlaybook] = useState<InterviewPlaybook | null>(null);
    const [modalContent, setModalContent] = useState<{title: string, content: string} | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [selectedForCompare, setSelectedForCompare] = useState<ResumeAnalysis[]>([]);
    const [outreachCandidate, setOutreachCandidate] = useState<ResumeAnalysis | null>(null);
    
    const isDemo = demoModalSequence !== 'none';

    useEffect(() => {
        if (!demoModalSequence) return;
        switch (demoModalSequence) {
            case 'comparison':
                if (results.length >= 2) {
                    setSelectedForCompare(results.slice(0, 2));
                    setModalContent({ title: 'Comparison Report', content: DUMMY_COMPARISON_REPORT });
                }
                break;
            case 'outreach':
                setModalContent(null);
                if (results.length > 0) setOutreachCandidate(results[0]);
                break;
            case 'results':
                setModalContent(null);
                setOutreachCandidate(null);
                break;
            case 'none':
                setModalContent(null);
                setOutreachCandidate(null);
                setSelectedForCompare([]); // CRITICAL: Reset bar when demo ends
                break;
        }
    }, [demoModalSequence, results]);

    const runAction = async (name: string, fn: () => Promise<string>) => {
        setLoadingAction(name);
        try {
            const content = await fn();
            setModalContent({ title: name, content });
        } catch (e) { console.error(e); } 
        finally { setLoadingAction(null); }
    };

    if (isLoading) {
         return (
             <div className="space-y-4 pt-4">
                 {progress && <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-6 shadow-xl mb-6"><AnalysisProgress progress={progress} /></div>}
                 <SkeletonLoader /><SkeletonLoader /><SkeletonLoader />
             </div>
         );
    }
    
    if (results.length === 0 && !isLoading) return (
        <div className="bg-[#0f172a] border border-[#1e293b] border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-lg font-medium text-white mb-2">No Candidates Analyzed</h3>
            <p className="text-slate-500 text-sm">Upload resumes to see the leaderboard.</p>
        </div>
    );

    const toggleSelection = (candidate: ResumeAnalysis) => {
        setSelectedForCompare(prev => prev.some(c => c.fileName === candidate.fileName) ? prev.filter(c => c.fileName !== candidate.fileName) : [...prev, candidate]);
    };

    return (
        <div className="space-y-8 pb-32 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Candidate Rankings</h2>
                    <div className="flex items-center space-x-2">
                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assessment Framework</span>
                    </div>
                 </div>
                 <button 
                    onClick={() => runAction('Executive Summary', () => generateExportReport(jobDescription, results))} 
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-500/20 border border-indigo-400/30"
                 >
                    Download Report
                 </button>
            </div>

            <div className="space-y-6">
                {talentDensityReport && <TalentDensityCard report={talentDensityReport} />}
                <div className="space-y-4">
                    {results.map((r, i) => (
                        <CandidateCard 
                            key={i} 
                            result={r} 
                            onPlaybook={async () => { setPlaybook(await generateInterviewPlaybook(jobDescription, r)); }} 
                            onOutreach={setOutreachCandidate} 
                            onViewText={(t) => setModalContent({title: 'Source Text', content: t})} 
                            isSelected={selectedForCompare.some(c => c.fileName === r.fileName)} 
                            onSelect={toggleSelection}
                            onMoveToInterview={onMoveToInterview}
                        />
                    ))}
                </div>
            </div>

            <ChatInterface jobDescription={jobDescription} analysisResults={results} initialMessage={initialChatMessage} />

            {selectedForCompare.length >= 2 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 animate-slideUp">
                    <div className="flex items-center gap-6 bg-slate-950/90 backdrop-blur-xl border border-indigo-500/30 p-5 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                         <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <span className="text-indigo-400 font-bold text-xs">{selectedForCompare.length}</span>
                            </div>
                            <span className="text-white text-[10px] font-bold uppercase tracking-widest">Candidates Selected</span>
                         </div>
                         <button 
                            onClick={() => runAction('Comparison Report', () => generateComparisonReport(jobDescription, selectedForCompare))} 
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-500/30 transition-all border border-indigo-400/30"
                         >
                            Compare Candidates
                         </button>
                         <button onClick={() => setSelectedForCompare([])} className="p-2 text-slate-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
                         </button>
                    </div>
                </div>
            )}

            {playbook && <Modal title={`Interview Playbook: ${playbook.candidateName}`} onClose={() => setPlaybook(null)} isDemo={isDemo}><div className="space-y-6"><p className="text-slate-200">{playbook.strategy}</p></div></Modal>}
            {modalContent && <Modal title={modalContent.title} onClose={() => setModalContent(null)} isDemo={isDemo}><div className="prose prose-invert prose-sm max-w-none text-slate-300" dangerouslySetInnerHTML={{ __html: marked.parse(modalContent.content) as string }} /></Modal>}
            {outreachCandidate && <OutreachModal jobDescription={jobDescription} candidate={outreachCandidate} onClose={() => setOutreachCandidate(null)} isDemo={isDemo} />}
        </div>
    );
};

export default AnalysisDashboard;