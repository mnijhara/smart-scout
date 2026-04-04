
import React from 'react';

const SkeletonLoader: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 animate-pulse" style={style}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-slate-700"></div>
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;