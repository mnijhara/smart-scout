import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
  onLoadDemo?: () => void;
  isDemoRunning?: boolean;
  credits?: number | null;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isCandidateView?: boolean;
}

const navItems = [
    { id: 'dashboard', label: 'Dashboard', requiresAuth: false },
    { id: 'interview', label: 'Interview', requiresAuth: false },
    { id: 'pricing', label: 'Pricing', requiresAuth: false },
    { id: 'analytics', label: 'Analytics', requiresAuth: true },
    { id: 'pool', label: 'History', requiresAuth: true }
];

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout, onLoginClick, onSignUpClick, onLoadDemo, isDemoRunning, credits, isMuted, onToggleMute, isCandidateView }) => {
  const visibleNavItems = navItems.filter(item => !item.requiresAuth || user);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 font-sans">
       {!isCandidateView && (
         <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-md border-b border-[#1e293b]">
           <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
             <div className="flex items-center justify-between py-3 h-16">
                 <div className="flex items-center gap-4 cursor-pointer shrink-0" onClick={() => !isCandidateView && setActiveTab('dashboard')}>
                     <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     </div>
                     <div>
                     <h1 className="text-xl font-black tracking-tighter text-white leading-none hidden sm:block uppercase">Smart Scout</h1>
                     <h1 className="text-xl font-black tracking-tighter text-white leading-none sm:hidden uppercase">Smart Scout</h1>
                    <span className="text-[9px] font-bold tracking-[0.3em] text-indigo-500 uppercase hidden sm:block">AI-Powered Recruitment</span>
                     </div>
                 </div>

                 {/* Desktop Center: Global Impact & Status */}
                 {!isCandidateView && (
                   <div className="hidden lg:flex items-center gap-8 px-8 border-x border-slate-800/50 mx-8">
                       <div className="flex flex-col">
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Global Impact</span>
                           <div className="flex items-center gap-2">
                               <span className="text-xs font-bold text-white tracking-tight">1.2M+</span>
                               <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Interviews</span>
                           </div>
                       </div>
                       <div className="flex flex-col">
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">System Status</span>
                           <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                               <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Operational</span>
                           </div>
                       </div>
                   </div>
                 )}
                 
                 {/* Desktop Right: Nav & User */}
                 {!isCandidateView && (
                   <div className="flex items-center gap-4 sm:gap-6 ml-auto">
                       <nav className="hidden md:flex items-center gap-1">
                           {visibleNavItems.map(tab => (
                           <button 
                               key={tab.id}
                               onClick={() => setActiveTab(tab.id)}
                               className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                               activeTab === tab.id 
                                   ? 'text-white' 
                                   : 'text-slate-500 hover:text-slate-300'
                               }`}
                           >
                               {tab.label}
                           </button>
                           ))}
                       </nav>
 
                       <div className="flex items-center gap-4 pl-0 sm:pl-4 sm:border-l border-slate-800">
                           {isDemoRunning && onToggleMute && (
                               <button
                                   onClick={onToggleMute}
                                   title={isMuted ? 'Unmute Narration' : 'Mute Narration'}
                                   className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                               >
                                   {isMuted ? (
                                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l4-4m0 0l-4-4m4 4H7" /></svg>
                                   ) : (
                                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                   )}
                               </button>
                           )}
                           {user ? (
                           <>
                               <div className="flex items-center gap-3">
                               {typeof credits === 'number' && (
                                   <div className="text-center">
                                       <div className="text-xs font-bold text-white">{credits}</div>
                                       <div className="text-[9px] font-medium text-slate-500 leading-none">Credits</div>
                                   </div>
                             )}
                             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                 {user.email?.[0].toUpperCase()}
                             </div>
                             <button onClick={onLogout} className="text-slate-500 hover:text-white transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                             </button>
                             </div>
                         </>
                         ) : (
                         <div className="flex items-center gap-2 sm:gap-4">
                             <button 
                                 onClick={onLoginClick}
                                 className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                             >
                                 Login
                             </button>
                             <button 
                                 onClick={onSignUpClick}
                                 className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-500/20"
                             >
                                 Sign Up Free
                             </button>
                         </div>
                         )}
                     </div>
                   </div>
                 )}
             </div>
 
              {/* Mobile Navigation Row */}
              {!isCandidateView && (
                <div className="md:hidden flex items-center justify-between pb-3 gap-2 overflow-x-auto no-scrollbar border-t border-slate-800/50 pt-2 px-1">
                    <nav className="flex items-center gap-0.5">
                        {visibleNavItems.map(tab => (
                            <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                            >
                            {tab.label}
                            </button>
                        ))}
                    </nav>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isDemoRunning && onToggleMute && (
                            <button
                                onClick={onToggleMute}
                                title={isMuted ? 'Unmute' : 'Mute'}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700/80 transition-colors border border-slate-700/50"
                            >
                                 {isMuted ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l4-4m0 0l-4-4m4 4H7" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                )}
                            </button>
                        )}
                        {activeTab === 'dashboard' && onLoadDemo && (
                            <button
                                onClick={onLoadDemo}
                                disabled={isDemoRunning}
                                className="btn-magic shrink-0 flex items-center gap-1 px-2 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-400/30 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:animate-none"
                            >
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Demo
                            </button>
                        )}
                    </div>
                </div>
              )}
           </div>
         </header>
       )}
      <main className="flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 py-4">{children}</main>
    </div>
  );
};

export default Layout;
