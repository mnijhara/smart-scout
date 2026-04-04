
import React from 'react';

interface AnalysisProgressProps {
  progress: {
    count: number;
    total: number;
    fileName: string;
  };
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ progress }) => {
  const percentage = progress.total > 0 ? Math.round((progress.count / progress.total) * 100) : 0;

  return (
    <div className="w-full px-2">
      <div className="flex justify-between items-center mb-2 text-sm font-medium text-slate-300">
        <span className="truncate max-w-[70%]">
          Analyzing: <span className="font-semibold text-white">{progress.fileName}</span>
        </span>
        <span className="flex-shrink-0">{progress.count} / {progress.total}</span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-linear" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default AnalysisProgress;