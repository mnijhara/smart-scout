import React, { useState, useEffect } from 'react';
import { getHistoricalPool } from '../services/supabase';

interface PoolManagementProps {
  userId?: string;
}

const PoolManagement: React.FC<PoolManagementProps> = ({ userId }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        return;
    }
    const fetchHistory = async () => {
      try {
        const data = await getHistoricalPool(userId);
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch pool history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  if (!userId) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-12 glass-panel border-slate-800/50 rounded-[2.5rem] mx-auto max-w-2xl mt-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-transparent opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
            
            <div className="relative z-10 w-24 h-24 bg-slate-950 rounded-3xl flex items-center justify-center mb-10 shadow-2xl border border-slate-800/50 group-hover:scale-110 transition-transform duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-tight">Archive Access Restricted</h2>
            <p className="text-slate-400 max-w-sm leading-relaxed mb-10 font-mono text-sm italic">"Please sign in to access your historical interview data and candidate reports."</p>
            
            <div className="flex gap-4 opacity-20 pointer-events-none blur-[2px] select-none mb-8">
                <div className="w-32 h-20 bg-slate-900 rounded-2xl border border-slate-800"></div>
                <div className="w-32 h-20 bg-slate-900 rounded-2xl border border-slate-800"></div>
                <div className="w-32 h-20 bg-slate-900 rounded-2xl border border-slate-800"></div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] font-mono text-red-500/70 uppercase tracking-widest">Status: Sign In Required</span>
            </div>
        </div>
      );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Interview History</h2>
            <div className="flex items-center space-x-2">
                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Past Interviews</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-slate-950/50 border border-slate-800/50 rounded-xl flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Records:</span>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{history.length}</span>
            </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel border border-slate-800/50 border-dashed rounded-[2.5rem] p-24 text-center flex flex-col items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent"></div>
          <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center mb-6 text-slate-700 border border-slate-800/50 shadow-2xl relative z-10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          </div>
          <p className="text-lg font-bold text-white uppercase tracking-widest relative z-10">No historical data found.</p>
          <p className="text-slate-500 text-sm mt-3 font-mono italic relative z-10">"Complete an interview to see your history here."</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((record, i) => (
            <div key={i} className="glass-panel border border-slate-800/50 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group cursor-pointer relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
               
               <div className="flex justify-between items-start mb-8 relative z-10">
                 <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-white text-xl truncate uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{record.candidateName}</h3>
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-indigo-500/50"></span>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{new Date(record.createdAt).toLocaleDateString()}</p>
                    </div>
                 </div>
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border-2 shadow-lg transition-all group-hover:scale-110 ${record.score >= 70 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                   {record.score}
                 </div>
               </div>
               
               <div className="relative mb-8">
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20"></div>
                   <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed relative z-10 h-10 font-mono italic ml-4">"{record.summary}"</p>
               </div>
               
               <div className="flex items-center justify-between pt-6 border-t border-slate-800/50 relative z-10">
                   <div className="flex items-center gap-3 text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-[9px] font-bold uppercase tracking-widest truncate max-w-[120px] group-hover:text-slate-400 transition-colors">{record.fileName}</span>
                   </div>
                   <button className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center gap-1">
                       View Report
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"></path></svg>
                   </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PoolManagement;
