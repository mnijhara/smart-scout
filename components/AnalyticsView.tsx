import React from 'react';
import { ResumeAnalysis } from '../types';

const AnalyticsView: React.FC<{ results: ResumeAnalysis[] }> = ({ results }) => {
  if (results.length === 0) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center text-center p-8 bg-surface border border-border border-dashed rounded-xl">
        <h2 className="text-lg font-medium text-white mb-2">No Data Available</h2>
        <p className="text-zinc-500 text-sm">Run an analysis to generate insights.</p>
      </div>
    );
  }

  const avgScore = Math.round(results.reduce((acc, curr) => acc + curr.overallScore, 0) / results.length);
  const topScore = Math.max(...results.map(r => r.overallScore));

  const getBarColor = (score: number) => {
      if (score >= 80) return 'bg-emerald-500 shadow-lg shadow-emerald-500/20';
      if (score >= 50) return 'bg-amber-500 shadow-lg shadow-amber-500/20';
      return 'bg-red-500 shadow-lg shadow-red-500/20';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Analytics Dashboard</h2>
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visual Insights</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-slate-950/50 border border-slate-800/50 rounded-xl flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Status:</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">Live Connection</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-8 rounded-2xl border border-slate-800/50 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
            <p className="text-[10px] font-bold text-slate-600 mb-2 uppercase tracking-[0.2em] group-hover:text-indigo-400 transition-colors">Total Candidates</p>
            <p className="text-5xl font-bold text-white">{results.length}</p>
            <div className="mt-4 flex items-center gap-2">
                <div className="w-full h-[2px] bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/50 w-full"></div>
                </div>
            </div>
        </div>
        <div className="glass-panel p-8 rounded-2xl border border-slate-800/50 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
            <p className="text-[10px] font-bold text-slate-600 mb-2 uppercase tracking-[0.2em] group-hover:text-emerald-400 transition-colors">Average Score</p>
            <p className="text-5xl font-bold text-emerald-500">{avgScore}%</p>
            <div className="mt-4 flex items-center gap-2">
                <div className="w-full h-[2px] bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/50" style={{ width: `${avgScore}%` }}></div>
                </div>
            </div>
        </div>
        <div className="glass-panel p-8 rounded-2xl border border-slate-800/50 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
            <p className="text-[10px] font-bold text-slate-600 mb-2 uppercase tracking-[0.2em] group-hover:text-indigo-400 transition-colors">Top Score</p>
            <p className="text-5xl font-bold text-indigo-400">{topScore}%</p>
            <div className="mt-4 flex items-center gap-2">
                <div className="w-full h-[2px] bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/50" style={{ width: `${topScore}%` }}></div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-8 rounded-2xl border border-slate-800/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
          <h3 className="text-[10px] font-black text-white mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            Competency Matrix
          </h3>
          <div className="space-y-8">
            {Object.keys(results[0].breakdown).map((key) => {
              const avg = Math.round(results.reduce((acc, curr) => acc + (curr.breakdown[key as keyof typeof curr.breakdown] || 0), 0) / results.length);
              return (
                <div key={key} className="group">
                  <div className="flex justify-between text-[10px] mb-3 font-bold uppercase tracking-widest">
                    <span className="text-slate-500 group-hover:text-slate-300 transition-colors">{key}</span>
                    <span className="text-indigo-400">{avg}%</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 p-[2px]">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-1000" style={{ width: `${avg}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-slate-800/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
          <h3 className="text-[10px] font-black text-white mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Rank Distribution
          </h3>
          <div className="flex items-end justify-between h-64 gap-3 px-4 pb-4 border-b border-l border-slate-800/30 bg-slate-950/30 rounded-bl-xl">
            {results.map((r, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-t-lg relative group transition-all duration-500 hover:scale-x-110 hover:brightness-125 ${getBarColor(r.overallScore)}`} 
                style={{ height: `${r.overallScore}%` }}
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 border border-indigo-500/30 text-white text-[9px] px-3 py-2 rounded-xl whitespace-nowrap z-20 pointer-events-none shadow-2xl scale-90 group-hover:scale-100">
                  <div className="font-black uppercase tracking-tighter mb-1">{r.candidateName}</div>
                  <div className="text-indigo-400 font-mono">SCORE: {r.overallScore}%</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center text-[10px] text-slate-600 uppercase tracking-[0.4em] font-bold">Candidate Ranking</div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;