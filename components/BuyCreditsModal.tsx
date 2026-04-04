import React from 'react';

interface BuyCreditsModalProps {
  onClose: () => void;
  onViewPlans: () => void;
}

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ onClose, onViewPlans }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div 
        className="w-full max-w-md relative z-10 bg-surface rounded-3xl p-8 sm:p-12 animate-slideUp border border-amber-500/20 shadow-2xl shadow-amber-500/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 mb-6 border border-amber-500/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">You're Out Of Credits</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            You've used all available analysis credits. To continue scoring candidates, please purchase a credit pack.
          </p>
          
          <div className="space-y-4">
             <button 
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
                onClick={onViewPlans}
             >
                Buy More Credits
            </button>
            <button 
                onClick={onClose}
                className="w-full h-12 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-colors"
            >
                Close
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-6">
            For enterprise plans, please contact <a href="mailto:sales@smartscout.online" className="text-slate-500 hover:text-indigo-400">sales@smartscout.online</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyCreditsModal;