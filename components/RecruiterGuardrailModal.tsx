import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface RecruiterGuardrailModalProps {
  onClose: () => void;
}

export const RecruiterGuardrailModal: React.FC<RecruiterGuardrailModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center space-x-3 mb-4 text-amber-500">
          <ShieldAlert className="w-8 h-8" />
          <h2 className="text-xl font-bold text-white">Recruiter Guardrail</h2>
        </div>
        <p className="text-slate-300 mb-6 text-sm">
          <strong>Notice:</strong> Real-time sentiment analysis is for <strong>post-interview coaching only</strong>. 
          Do not use this data to intervene in live interviews, as it may introduce unconscious bias and negatively impact the candidate experience.
        </p>
        <button 
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          I Understand, Proceed to Coaching
        </button>
      </div>
    </div>
  );
};
