import React, { useState } from 'react';
import { RecruiterGuardrailModal } from './RecruiterGuardrailModal';
import { Activity } from 'lucide-react';

export const LiveSourcingDashboard: React.FC = () => {
  const [showGuardrail, setShowGuardrail] = useState(true);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      {showGuardrail && <RecruiterGuardrailModal onClose={() => setShowGuardrail(false)} />}
      
      <div className="flex items-center space-x-3 mb-8">
        <Activity className="w-8 h-8 text-indigo-500" />
        <h1 className="text-3xl font-black tracking-tight">Live Vibe Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for live interview cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Candidate: John Doe</h2>
          <div className="h-32 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
            Vibe Meter Placeholder
          </div>
        </div>
      </div>
    </div>
  );
};
